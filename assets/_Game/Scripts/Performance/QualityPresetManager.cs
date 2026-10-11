using System;
using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.Performance
{
    public enum QualityTier
    {
        Low,
        Medium,
        High,
        Mobile
    }

    public enum AntiAliasingMode
    {
        Off = 0,
        FXAA = 1,
        MSAA2x = 2,
        MSAA4x = 3
    }

    [Serializable]
    public struct QualityProfile
    {
        public QualityTier Tier;
        public float ShadowDistance;
        public int ShadowResolutionTier; // 0: None, 1: Low, 2: Medium, 3: High
        public float RenderScale;
        public AntiAliasingMode AAMode;
        public float CrowdDensity;
        public float ParticleDensity;
        public bool HighQualityLighting;
        public int TextureQuality; // 0 = Full resolution, 1 = Half resolution
        public bool BallContrastBoost; // Guaranteed true across all presets for ball visibility
        public bool PitchMarkersVisible; // Guaranteed true across all presets for pitch readability
    }

    /// <summary>
    /// Manages graphics quality tiers (Low, Medium, High, Mobile).
    /// Adjusts shadow distance, render scale, anti-aliasing, crowd density, particle density,
    /// lighting quality, and texture resolution while strictly guaranteeing ball visibility
    /// and crease readability across all presets.
    /// </summary>
    public class QualityPresetManager : MonoBehaviour
    {
        private static QualityPresetManager _instance;
        public static QualityPresetManager Instance => _instance;

        [Header("Current Configuration")]
        [SerializeField] private QualityTier _currentTier = QualityTier.High;
        [SerializeField] private QualityProfile _activeProfile;

        public QualityTier CurrentTier => _currentTier;
        public QualityProfile ActiveProfile => _activeProfile;

        public static event Action<QualityProfile> OnQualityPresetChanged;

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }
            _instance = this;

            ApplyPreset(_currentTier);
        }

        /// <summary>
        /// Generates the calibrated profile for a given quality tier.
        /// Guaranteed: BallContrastBoost and PitchMarkersVisible are true across all tiers.
        /// </summary>
        public static QualityProfile GetProfileForTier(QualityTier tier)
        {
            switch (tier)
            {
                case QualityTier.Low:
                    return new QualityProfile
                    {
                        Tier = QualityTier.Low,
                        ShadowDistance = 20.0f,
                        ShadowResolutionTier = 1, // Low
                        RenderScale = 0.75f,
                        AAMode = AntiAliasingMode.Off,
                        CrowdDensity = 0.25f,
                        ParticleDensity = 0.25f,
                        HighQualityLighting = false,
                        TextureQuality = 1, // Half resolution
                        BallContrastBoost = true,
                        PitchMarkersVisible = true
                    };

                case QualityTier.Mobile:
                    return new QualityProfile
                    {
                        Tier = QualityTier.Mobile,
                        ShadowDistance = 35.0f,
                        ShadowResolutionTier = 1, // Low cascaded
                        RenderScale = 0.85f,
                        AAMode = AntiAliasingMode.FXAA,
                        CrowdDensity = 0.35f,
                        ParticleDensity = 0.35f,
                        HighQualityLighting = false,
                        TextureQuality = 0,
                        BallContrastBoost = true,
                        PitchMarkersVisible = true
                    };

                case QualityTier.Medium:
                    return new QualityProfile
                    {
                        Tier = QualityTier.Medium,
                        ShadowDistance = 65.0f,
                        ShadowResolutionTier = 2, // Medium
                        RenderScale = 1.0f,
                        AAMode = AntiAliasingMode.MSAA2x,
                        CrowdDensity = 0.65f,
                        ParticleDensity = 0.70f,
                        HighQualityLighting = true,
                        TextureQuality = 0,
                        BallContrastBoost = true,
                        PitchMarkersVisible = true
                    };

                case QualityTier.High:
                default:
                    return new QualityProfile
                    {
                        Tier = QualityTier.High,
                        ShadowDistance = 150.0f,
                        ShadowResolutionTier = 3, // High
                        RenderScale = 1.0f,
                        AAMode = AntiAliasingMode.MSAA4x,
                        CrowdDensity = 1.0f,
                        ParticleDensity = 1.0f,
                        HighQualityLighting = true,
                        TextureQuality = 0,
                        BallContrastBoost = true,
                        PitchMarkersVisible = true
                    };
            }
        }

        /// <summary>
        /// Applies the requested quality tier to Unity engine settings and notifies systems.
        /// </summary>
        public void ApplyPreset(QualityTier tier)
        {
            _currentTier = tier;
            _activeProfile = GetProfileForTier(tier);

            // Apply texture quality limit
            QualitySettings.globalTextureMipmapLimit = _activeProfile.TextureQuality;

            // Apply shadow distance
            QualitySettings.shadowDistance = _activeProfile.ShadowDistance;

            // Apply particle raycast budget & particle quality
            QualitySettings.particleRaycastBudget = (int)(1024 * _activeProfile.ParticleDensity);

            CricketLogger.Log(LogChannel.Presentation,
                $"Applied Quality Preset [{tier}]: Shadows={_activeProfile.ShadowDistance}m, " +
                $"RenderScale={_activeProfile.RenderScale:F2}, AA={_activeProfile.AAMode}, " +
                $"CrowdDensity={_activeProfile.CrowdDensity:P0}, Particles={_activeProfile.ParticleDensity:P0}");

            OnQualityPresetChanged?.Invoke(_activeProfile);
        }

        public void SetTierForTesting(QualityTier tier)
        {
            ApplyPreset(tier);
        }
    }
}
