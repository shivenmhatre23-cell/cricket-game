using System;
using System.Collections.Generic;
using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.Performance
{
    public enum EffectType
    {
        BallBounceDust,
        BatContactSparks,
        WicketWoodSplinter,
        BallTrailEffect,
        AudioOneShot
    }

    /// <summary>
    /// Reusable pool item wrapper tracking active state and return-to-pool lifetime.
    /// </summary>
    public class PooledItem : MonoBehaviour
    {
        [SerializeField] private EffectType _effectType;
        private ObjectPoolManager _poolManager;
        private float _activeLifetime = 2.0f;
        private float _elapsedTime = 0f;
        private bool _isSpawned = false;

        public EffectType Type => _effectType;
        public bool IsSpawned => _isSpawned;

        public void Initialize(EffectType type, ObjectPoolManager manager, float lifetime = 2.0f)
        {
            _effectType = type;
            _poolManager = manager;
            _activeLifetime = lifetime;
            _isSpawned = false;
        }

        public void OnSpawn(Vector3 position, Quaternion rotation)
        {
            transform.position = position;
            transform.rotation = rotation;
            gameObject.SetActive(true);
            _elapsedTime = 0f;
            _isSpawned = true;
        }

        private void Update()
        {
            if (!_isSpawned) return;

            _elapsedTime += Time.deltaTime;
            if (_elapsedTime >= _activeLifetime)
            {
                Recycle();
            }
        }

        public void Recycle()
        {
            if (!_isSpawned) return;

            _isSpawned = false;
            gameObject.SetActive(false);

            if (_poolManager != null)
            {
                _poolManager.ReturnToPool(this);
            }
        }
    }

    /// <summary>
    /// High-performance zero-allocation object pool for repetitive visual effects,
    /// audio bursts, and physics particles during gameplay deliveries.
    /// Eliminates garbage collection spikes in FixedUpdate and Update.
    /// </summary>
    public class ObjectPoolManager : MonoBehaviour
    {
        private static ObjectPoolManager _instance;
        public static ObjectPoolManager Instance => _instance;

        [Header("Pre-warm Settings")]
        [SerializeField] private int _defaultInitialCapacity = 10;
        [SerializeField] private int _maxCapacityPerType = 30;

        // Pooled object containers by effect type
        private readonly Dictionary<EffectType, Queue<PooledItem>> _inactivePools =
            new Dictionary<EffectType, Queue<PooledItem>>();
        private readonly Dictionary<EffectType, List<PooledItem>> _allAllocatedItems =
            new Dictionary<EffectType, List<PooledItem>>();

        public int GetInactiveCount(EffectType type) =>
            _inactivePools.TryGetValue(type, out var q) ? q.Count : 0;

        public int GetTotalAllocated(EffectType type) =>
            _allAllocatedItems.TryGetValue(type, out var list) ? list.Count : 0;

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }
            _instance = this;

            PrewarmAllPools();
        }

        /// <summary>
        /// Pre-warms object pools for all gameplay effect types to prevent allocation spikes during overs.
        /// </summary>
        public void PrewarmAllPools()
        {
            foreach (EffectType type in Enum.GetValues(typeof(EffectType)))
            {
                PrewarmPool(type, _defaultInitialCapacity);
            }
        }

        public void PrewarmPool(EffectType type, int count)
        {
            if (!_inactivePools.ContainsKey(type))
            {
                _inactivePools[type] = new Queue<PooledItem>(count);
                _allAllocatedItems[type] = new List<PooledItem>(count);
            }

            int existing = _allAllocatedItems[type].Count;
            int needed = count - existing;

            for (int i = 0; i < needed; i++)
            {
                PooledItem item = CreateNewItem(type);
                _inactivePools[type].Enqueue(item);
                _allAllocatedItems[type].Add(item);
            }
        }

        private PooledItem CreateNewItem(EffectType type)
        {
            GameObject go = new GameObject($"Pooled_{type}");
            go.transform.SetParent(transform);
            go.SetActive(false);

            PooledItem item = go.AddComponent<PooledItem>();
            item.Initialize(type, this);
            return item;
        }

        /// <summary>
        /// Spawns a pooled effect at given position/rotation without instantiating new objects.
        /// </summary>
        public PooledItem Spawn(EffectType type, Vector3 position, Quaternion rotation, float lifetime = 2.0f)
        {
            if (!_inactivePools.ContainsKey(type))
            {
                _inactivePools[type] = new Queue<PooledItem>();
                _allAllocatedItems[type] = new List<PooledItem>();
            }

            PooledItem item;
            if (_inactivePools[type].Count > 0)
            {
                item = _inactivePools[type].Dequeue();
            }
            else
            {
                // Pool exhausted; allocate new if below max capacity, or recycle oldest active
                if (_allAllocatedItems[type].Count < _maxCapacityPerType)
                {
                    item = CreateNewItem(type);
                    _allAllocatedItems[type].Add(item);
                }
                else
                {
                    // Steal the oldest active item
                    item = _allAllocatedItems[type][0];
                    item.Recycle();
                }
            }

            item.Initialize(type, this, lifetime);
            item.OnSpawn(position, rotation);
            return item;
        }

        public void ReturnToPool(PooledItem item)
        {
            if (item == null) return;

            EffectType type = item.Type;
            if (!_inactivePools.ContainsKey(type))
            {
                _inactivePools[type] = new Queue<PooledItem>();
            }

            if (!_inactivePools[type].Contains(item))
            {
                _inactivePools[type].Enqueue(item);
            }
        }

        /// <summary>
        /// Recycles all active items across all pools (e.g., between overs or innings).
        /// </summary>
        public void RecycleAllActive()
        {
            foreach (var kvp in _allAllocatedItems)
            {
                for (int i = 0; i < kvp.Value.Count; i++)
                {
                    if (kvp.Value[i] != null && kvp.Value[i].IsSpawned)
                    {
                        kvp.Value[i].Recycle();
                    }
                }
            }
        }
    }
}
