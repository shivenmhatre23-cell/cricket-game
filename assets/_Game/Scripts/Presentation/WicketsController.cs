using System;
using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.Presentation
{
    public enum WicketEnd
    {
        StrikerEnd,
        BowlerEnd
    }

    /// <summary>
    /// Controls a set of 3 stumps and 2 bails at either end of the pitch.
    /// Handles physical collision with the cricket ball, bail dislodgement, and reset.
    /// </summary>
    public class WicketsController : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private WicketEnd _end = WicketEnd.StrikerEnd;
        [SerializeField] private bool _isBroken = false;

        [Header("Components (Created procedurally or assigned)")]
        [SerializeField] private Transform[] _stumps = new Transform[3]; // Off, Middle, Leg
        [SerializeField] private Rigidbody[] _bails = new Rigidbody[2];  // Left, Right

        private Vector3[] _stumpOriginalPositions = new Vector3[3];
        private Quaternion[] _stumpOriginalRotations = new Quaternion[3];
        private Vector3[] _bailOriginalPositions = new Vector3[2];
        private Quaternion[] _bailOriginalRotations = new Quaternion[2];

        public WicketEnd End => _end;
        public bool IsBroken => _isBroken;

        public event Action<WicketEnd, Vector3> OnWicketsBroken;

        private void Awake()
        {
            RecordOriginalTransforms();
        }

        private void RecordOriginalTransforms()
        {
            for (int i = 0; i < _stumps.Length; i++)
            {
                if (_stumps[i] != null)
                {
                    _stumpOriginalPositions[i] = _stumps[i].localPosition;
                    _stumpOriginalRotations[i] = _stumps[i].localRotation;
                }
            }

            for (int i = 0; i < _bails.Length; i++)
            {
                if (_bails[i] != null)
                {
                    _bailOriginalPositions[i] = _bails[i].transform.localPosition;
                    _bailOriginalRotations[i] = _bails[i].transform.localRotation;
                }
            }
        }

        /// <summary>
        /// Dislodges bails and tilts stumps upon ball contact.
        /// </summary>
        public void BreakWickets(Vector3 impactPoint, Vector3 impactVelocity)
        {
            if (_isBroken) return;
            _isBroken = true;

            CricketLogger.LogInfo(LogChannel.Physics,
                $"Wickets broken at {_end}! Impact Velocity={impactVelocity.magnitude:F1} m/s");

            // Apply physical scatter impulse to bails
            for (int i = 0; i < _bails.Length; i++)
            {
                if (_bails[i] != null)
                {
                    _bails[i].isKinematic = false;
                    _bails[i].useGravity = true;

                    Vector3 scatterForce = impactVelocity * 0.45f + Vector3.up * UnityEngine.Random.Range(2.5f, 5.0f);
                    scatterForce += UnityEngine.Random.insideUnitSphere * 1.5f;
                    _bails[i].AddForce(scatterForce, ForceMode.Impulse);
                    _bails[i].AddTorque(UnityEngine.Random.insideUnitSphere * 12f, ForceMode.Impulse);
                }
            }

            OnWicketsBroken?.Invoke(_end, impactPoint);
        }

        public void ConfigureEnd(WicketEnd end)
        {
            _end = end;
        }

        public void SetBroken(bool isBroken)
        {
            _isBroken = isBroken;
        }

        /// <summary>
        /// Resets stumps and bails back to pristine upright positions.
        /// </summary>
        public void ResetWickets()
        {
            _isBroken = false;

            for (int i = 0; i < _stumps.Length; i++)
            {
                if (_stumps[i] != null)
                {
                    _stumps[i].localPosition = _stumpOriginalPositions[i];
                    _stumps[i].localRotation = _stumpOriginalRotations[i];
                }
            }

            for (int i = 0; i < _bails.Length; i++)
            {
                if (_bails[i] != null)
                {
                    _bails[i].isKinematic = true;
                    _bails[i].useGravity = false;
                    _bails[i].linearVelocity = Vector3.zero;
                    _bails[i].angularVelocity = Vector3.zero;
                    _bails[i].transform.localPosition = _bailOriginalPositions[i];
                    _bails[i].transform.localRotation = _bailOriginalRotations[i];
                }
            }
        }

        private void OnCollisionEnter(Collision collision)
        {
            if (collision.gameObject.CompareTag("CricketBall") || collision.gameObject.name.Contains("Ball"))
            {
                Vector3 contactPoint = collision.contacts.Length > 0 ? collision.contacts[0].point : transform.position;
                BreakWickets(contactPoint, collision.relativeVelocity);
            }
        }

        /// <summary>
        /// Procedurally constructs standard 3 stumps and 2 bails if not pre-configured via prefab.
        /// </summary>
        public void SetupProceduralWicketStructure(Material woodMaterial)
        {
            // Clear existing children
            while (transform.childCount > 0)
            {
                DestroyImmediate(transform.GetChild(0).gameObject);
            }

            float halfStumpSpacing = PitchCoordinates.StumpSpacing;
            float[] xOffsets = { -halfStumpSpacing, 0f, halfStumpSpacing };

            // 1. Create 3 Stumps (Cylinders)
            _stumps = new Transform[3];
            for (int i = 0; i < 3; i++)
            {
                GameObject stumpObj = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                stumpObj.name = $"Stump_{(i == 0 ? "Leg" : i == 1 ? "Middle" : "Off")}";
                stumpObj.transform.SetParent(transform);
                stumpObj.transform.localPosition = new Vector3(xOffsets[i], PitchCoordinates.StumpHeight * 0.5f, 0f);
                stumpObj.transform.localScale = new Vector3(
                    PitchCoordinates.StumpRadius * 2f,
                    PitchCoordinates.StumpHeight * 0.5f,
                    PitchCoordinates.StumpRadius * 2f
                );

                if (woodMaterial != null)
                {
                    stumpObj.GetComponent<Renderer>().sharedMaterial = woodMaterial;
                }

                _stumps[i] = stumpObj.transform;
            }

            // 2. Create 2 Bails (Cylinders horizontally resting atop stumps)
            _bails = new Rigidbody[2];
            float[] bailXOffsets = { -halfStumpSpacing * 0.5f, halfStumpSpacing * 0.5f };

            for (int b = 0; b < 2; b++)
            {
                GameObject bailObj = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                bailObj.name = $"Bail_{(b == 0 ? "Left" : "Right")}";
                bailObj.transform.SetParent(transform);
                bailObj.transform.localPosition = new Vector3(bailXOffsets[b], PitchCoordinates.StumpHeight + PitchCoordinates.BailRadius, 0f);
                bailObj.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
                bailObj.transform.localScale = new Vector3(
                    PitchCoordinates.BailRadius * 2f,
                    PitchCoordinates.BailLength * 0.5f,
                    PitchCoordinates.BailRadius * 2f
                );

                if (woodMaterial != null)
                {
                    bailObj.GetComponent<Renderer>().sharedMaterial = woodMaterial;
                }

                Rigidbody rb = bailObj.AddComponent<Rigidbody>();
                rb.mass = 0.05f;
                rb.isKinematic = true;
                rb.useGravity = false;
                _bails[b] = rb;
            }

            RecordOriginalTransforms();
        }
    }
}
