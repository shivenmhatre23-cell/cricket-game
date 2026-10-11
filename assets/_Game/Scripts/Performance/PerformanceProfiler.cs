using System;
using System.Text;
using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.Performance
{
    [Serializable]
    public struct ProfilerSnapshot
    {
        public float CurrentFps;
        public float AverageFps;
        public float MinFps;
        public float MaxFps;
        public float CpuFrameTimeMs;
        public long ManagedMemoryBytes;
        public int Gen0Collections;
        public int Gen1Collections;
        public int Gen2Collections;
        public float LastSceneLoadTimeSeconds;
    }

    /// <summary>
    /// Runtime performance profiler measuring frame rate, CPU frame time,
    /// memory usage, garbage collector churn, and scene load benchmarks.
    /// Used for standalone development profiling on PC and Mobile.
    /// </summary>
    public class PerformanceProfiler : MonoBehaviour
    {
        private static PerformanceProfiler _instance;
        public static PerformanceProfiler Instance => _instance;

        [Header("Profiler Configuration")]
        [SerializeField] private int _sampleBufferSize = 60;
        [SerializeField] private bool _enableContinuousProfiling = true;

        private float[] _frameTimeSamples;
        private int _sampleIndex = 0;
        private int _sampleCount = 0;

        private float _loadBenchmarkStartTime = 0f;
        private float _lastSceneLoadDuration = 0f;

        private ProfilerSnapshot _latestSnapshot;
        public ProfilerSnapshot LatestSnapshot => _latestSnapshot;

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }
            _instance = this;
            DontDestroyOnLoad(gameObject);

            _frameTimeSamples = new float[_sampleBufferSize];
        }

        private void Update()
        {
            if (!_enableContinuousProfiling) return;

            RecordFrame(Time.unscaledDeltaTime);
        }

        /// <summary>
        /// Records a single frame's delta time into the rolling buffer.
        /// </summary>
        public void RecordFrame(float deltaTime)
        {
            if (deltaTime <= 0.0001f) deltaTime = 0.0001f;

            if (_frameTimeSamples == null || _frameTimeSamples.Length != _sampleBufferSize)
            {
                _frameTimeSamples = new float[_sampleBufferSize];
                _sampleIndex = 0;
                _sampleCount = 0;
            }

            _frameTimeSamples[_sampleIndex] = deltaTime;
            _sampleIndex = (_sampleIndex + 1) % _sampleBufferSize;
            if (_sampleCount < _sampleBufferSize) _sampleCount++;

            ComputeSnapshot(deltaTime);
        }

        private void ComputeSnapshot(float latestDeltaTime)
        {
            float sum = 0f;
            float minDelta = float.MaxValue;
            float maxDelta = float.MinValue;

            for (int i = 0; i < _sampleCount; i++)
            {
                float dt = _frameTimeSamples[i];
                sum += dt;
                if (dt < minDelta) minDelta = dt;
                if (dt > maxDelta) maxDelta = dt;
            }

            float avgDelta = _sampleCount > 0 ? sum / _sampleCount : latestDeltaTime;

            _latestSnapshot.CurrentFps = 1.0f / latestDeltaTime;
            _latestSnapshot.AverageFps = 1.0f / avgDelta;
            _latestSnapshot.MinFps = maxDelta > 0.0001f ? 1.0f / maxDelta : 0f;
            _latestSnapshot.MaxFps = minDelta > 0.0001f ? 1.0f / minDelta : 0f;
            _latestSnapshot.CpuFrameTimeMs = latestDeltaTime * 1000f;
            _latestSnapshot.ManagedMemoryBytes = GC.GetTotalMemory(false);
            _latestSnapshot.Gen0Collections = GC.CollectionCount(0);
            _latestSnapshot.Gen1Collections = GC.CollectionCount(1);
            _latestSnapshot.Gen2Collections = GC.CollectionCount(2);
            _latestSnapshot.LastSceneLoadTimeSeconds = _lastSceneLoadDuration;
        }

        public void StartSceneLoadBenchmark()
        {
            _loadBenchmarkStartTime = Time.realtimeSinceStartup;
        }

        public void EndSceneLoadBenchmark()
        {
            _lastSceneLoadDuration = Time.realtimeSinceStartup - _loadBenchmarkStartTime;
            _latestSnapshot.LastSceneLoadTimeSeconds = _lastSceneLoadDuration;
            CricketLogger.Log(LogChannel.Core,
                $"Scene Load Benchmark completed in {_lastSceneLoadDuration:F3}s.");
        }

        /// <summary>
        /// Formats structured diagnostic report string for developer telemetry and QA logs.
        /// </summary>
        public string GetPerformanceReport()
        {
            float memoryMb = _latestSnapshot.ManagedMemoryBytes / (1024f * 1024f);
            return $"[Performance Report] FPS: {_latestSnapshot.CurrentFps:F1} (Avg: {_latestSnapshot.AverageFps:F1}, " +
                   $"Min: {_latestSnapshot.MinFps:F1}, Max: {_latestSnapshot.MaxFps:F1}) | " +
                   $"CPU Frame Time: {_latestSnapshot.CpuFrameTimeMs:F2}ms | " +
                   $"Managed Memory: {memoryMb:F2} MB | " +
                   $"GC Collections: Gen0={_latestSnapshot.Gen0Collections}, Gen1={_latestSnapshot.Gen1Collections}, Gen2={_latestSnapshot.Gen2Collections} | " +
                   $"Last Load: {_latestSnapshot.LastSceneLoadTimeSeconds:F3}s";
        }
    }
}
