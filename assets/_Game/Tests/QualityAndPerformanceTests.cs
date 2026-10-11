using System;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using CricketLegends.Performance;

namespace CricketLegends.Tests
{
    [TestFixture]
    public class QualityAndPerformanceTests
    {
        private GameObject _holderObject;
        private QualityPresetManager _qualityManager;
        private ObjectPoolManager _poolManager;
        private WindowsDisplaySettings _displaySettings;
        private AndroidOptimizationConfig _androidConfig;
        private PerformanceProfiler _profiler;

        [SetUp]
        public void SetUp()
        {
            _holderObject = new GameObject("Test_PerformanceHolder");
            _qualityManager = _holderObject.AddComponent<QualityPresetManager>();
            _poolManager = _holderObject.AddComponent<ObjectPoolManager>();
            _displaySettings = _holderObject.AddComponent<WindowsDisplaySettings>();
            _androidConfig = _holderObject.AddComponent<AndroidOptimizationConfig>();
            _profiler = _holderObject.AddComponent<PerformanceProfiler>();
        }

        [TearDown]
        public void TearDown()
        {
            if (_holderObject != null)
            {
                UnityEngine.Object.DestroyImmediate(_holderObject);
            }
        }

        [Test]
        public void QualityPresetManager_LowProfile_ConfiguresAppropriateSettings_AndGuaranteesBallVisibility()
        {
            // Act
            QualityProfile profile = QualityPresetManager.GetProfileForTier(QualityTier.Low);

            // Assert
            Assert.AreEqual(QualityTier.Low, profile.Tier);
            Assert.AreEqual(20.0f, profile.ShadowDistance, 0.01f);
            Assert.AreEqual(0.75f, profile.RenderScale, 0.01f);
            Assert.AreEqual(AntiAliasingMode.Off, profile.AAMode);
            Assert.AreEqual(0.25f, profile.CrowdDensity, 0.01f);
            Assert.AreEqual(0.25f, profile.ParticleDensity, 0.01f);
            Assert.AreEqual(1, profile.TextureQuality, "Low preset should reduce texture mip level to save VRAM");

            // CRITICAL INVARIANT: Ball and pitch readability must NEVER be degraded
            Assert.IsTrue(profile.BallContrastBoost, "Ball contrast boost must remain true on Low tier");
            Assert.IsTrue(profile.PitchMarkersVisible, "Pitch markers must remain visible on Low tier");
        }

        [Test]
        public void QualityPresetManager_MobileProfile_ConfiguresMobileSettings_AndGuaranteesBallVisibility()
        {
            // Act
            QualityProfile profile = QualityPresetManager.GetProfileForTier(QualityTier.Mobile);

            // Assert
            Assert.AreEqual(QualityTier.Mobile, profile.Tier);
            Assert.AreEqual(35.0f, profile.ShadowDistance, 0.01f);
            Assert.AreEqual(0.85f, profile.RenderScale, 0.01f);
            Assert.AreEqual(AntiAliasingMode.FXAA, profile.AAMode);
            Assert.IsFalse(profile.HighQualityLighting, "Mobile preset should use single shadow caster without soft floodlights");
            Assert.IsTrue(profile.BallContrastBoost, "Ball contrast boost must remain true on Mobile tier");
            Assert.IsTrue(profile.PitchMarkersVisible, "Pitch markers must remain visible on Mobile tier");
        }

        [Test]
        public void QualityPresetManager_HighProfile_ConfiguresUltraSettings()
        {
            // Act
            QualityProfile profile = QualityPresetManager.GetProfileForTier(QualityTier.High);

            // Assert
            Assert.AreEqual(QualityTier.High, profile.Tier);
            Assert.AreEqual(150.0f, profile.ShadowDistance, 0.01f);
            Assert.AreEqual(1.0f, profile.RenderScale, 0.01f);
            Assert.AreEqual(AntiAliasingMode.MSAA4x, profile.AAMode);
            Assert.AreEqual(1.0f, profile.CrowdDensity, 0.01f);
            Assert.AreEqual(1.0f, profile.ParticleDensity, 0.01f);
            Assert.IsTrue(profile.HighQualityLighting);
            Assert.AreEqual(0, profile.TextureQuality, "High tier must use full resolution textures");
        }

        [Test]
        public void ObjectPoolManager_PrewarmsAndSpawnsEffects_WithoutNullReferences()
        {
            // Arrange
            _poolManager.PrewarmPool(EffectType.BallBounceDust, 5);
            Assert.AreEqual(5, _poolManager.GetInactiveCount(EffectType.BallBounceDust));

            // Act: Spawn item
            Vector3 spawnPos = new Vector3(0f, 0.1f, 5.0f);
            PooledItem item = _poolManager.Spawn(EffectType.BallBounceDust, spawnPos, Quaternion.identity, 1.5f);

            // Assert
            Assert.IsNotNull(item);
            Assert.IsTrue(item.IsSpawned);
            Assert.AreEqual(spawnPos, item.transform.position);
            Assert.AreEqual(4, _poolManager.GetInactiveCount(EffectType.BallBounceDust));

            // Act: Return to pool
            item.Recycle();

            // Assert
            Assert.IsFalse(item.IsSpawned);
            Assert.AreEqual(5, _poolManager.GetInactiveCount(EffectType.BallBounceDust));
        }

        [Test]
        public void ObjectPoolManager_RecycleAllActive_CleansAllSpawnedInstances()
        {
            // Arrange
            _poolManager.PrewarmPool(EffectType.BatContactSparks, 5);
            PooledItem item1 = _poolManager.Spawn(EffectType.BatContactSparks, Vector3.zero, Quaternion.identity);
            PooledItem item2 = _poolManager.Spawn(EffectType.BatContactSparks, Vector3.up, Quaternion.identity);

            Assert.IsTrue(item1.IsSpawned);
            Assert.IsTrue(item2.IsSpawned);
            Assert.AreEqual(3, _poolManager.GetInactiveCount(EffectType.BatContactSparks));

            // Act: Recycle all active items (e.g. over change)
            _poolManager.RecycleAllActive();

            // Assert
            Assert.IsFalse(item1.IsSpawned);
            Assert.IsFalse(item2.IsSpawned);
            Assert.AreEqual(5, _poolManager.GetInactiveCount(EffectType.BatContactSparks));
        }

        [Test]
        public void WindowsDisplaySettings_AppliesAndClampsResolutions_Correctly()
        {
            // Act: Apply 1920x1080 Fullscreen
            _displaySettings.SetSettingsForTesting(1920, 1080, FullScreenMode.ExclusiveFullScreen, 1, 144);

            // Assert
            Assert.AreEqual(1920, _displaySettings.CurrentWidth);
            Assert.AreEqual(1080, _displaySettings.CurrentHeight);
            Assert.AreEqual(FullScreenMode.ExclusiveFullScreen, _displaySettings.CurrentMode);
            Assert.AreEqual(1, _displaySettings.VSyncCount);
            Assert.AreEqual(144, _displaySettings.TargetFrameRate);

            // Verify supported resolutions collection contains standard widescreen tiers
            Assert.GreaterOrEqual(WindowsDisplaySettings.StandardResolutions.Count, 5);
            Assert.IsTrue(WindowsDisplaySettings.StandardResolutions.Exists(r => r.Width == 1920 && r.Height == 1080));
            Assert.IsTrue(WindowsDisplaySettings.StandardResolutions.Exists(r => r.Width == 2560 && r.Height == 1440));
        }

        [Test]
        public void AndroidOptimizationConfig_CalculatesSafeAreas_AndLocksLandscape()
        {
            // Arrange: Simulate phone screen (2400 x 1080) with a 90px camera notch on the left
            Rect notchSafeArea = new Rect(90f, 0f, 2310f, 1080f);

            // Act
            _androidConfig.SetMobileConfigForTesting(60, notchSafeArea, 2400f, 1080f);

            // Assert
            Assert.AreEqual(60, _androidConfig.TargetMobileFps);
            Assert.IsTrue(_androidConfig.LockLandscape);
            Assert.AreEqual(90f, _androidConfig.Insets.LeftInset, 0.01f, "Left notch inset must be 90px");
            Assert.AreEqual(0f, _androidConfig.Insets.RightInset, 0.01f);
            Assert.AreEqual(0f, _androidConfig.Insets.TopInset, 0.01f);
            Assert.AreEqual(0f, _androidConfig.Insets.BottomInset, 0.01f);
        }

        [Test]
        public void PerformanceProfiler_RecordsFrames_AndComputesValidMetrics()
        {
            // Arrange: Feed 60 frames of 1/60th second (16.666ms)
            float fixedDelta = 1.0f / 60.0f;
            for (int i = 0; i < 60; i++)
            {
                _profiler.RecordFrame(fixedDelta);
            }

            // Act
            ProfilerSnapshot snapshot = _profiler.LatestSnapshot;
            string report = _profiler.GetPerformanceReport();

            // Assert
            Assert.AreEqual(60.0f, snapshot.AverageFps, 1.0f);
            Assert.AreEqual(16.666f, snapshot.CpuFrameTimeMs, 0.5f);
            Assert.GreaterOrEqual(snapshot.ManagedMemoryBytes, 0);
            Assert.IsNotNull(report);
            Assert.IsTrue(report.Contains("[Performance Report]"));
            Assert.IsTrue(report.Contains("FPS:"));
            Assert.IsTrue(report.Contains("CPU Frame Time:"));
        }
    }
}
