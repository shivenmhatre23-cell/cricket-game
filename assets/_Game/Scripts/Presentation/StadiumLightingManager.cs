using UnityEngine;
using UnityEngine.Rendering;
using CricketLegends.Core;

namespace CricketLegends.Presentation
{
    public enum StadiumAtmosphere
    {
        DaySunny,
        NightFloodlights
    }

    /// <summary>
    /// Manages stadium environment lighting, sun position, floodlights, and mobile shadow scaling.
    /// Fully compatible with URP and scalable across PC and Android/iOS.
    /// </summary>
    public class StadiumLightingManager : MonoBehaviour
    {
        [Header("Active Atmosphere")]
        [SerializeField] private StadiumAtmosphere _currentAtmosphere = StadiumAtmosphere.DaySunny;

        [Header("Primary Sunlight")]
        [SerializeField] private Light _sunLight;
        [SerializeField] private Color _daySunColor = new Color(1.0f, 0.98f, 0.93f);
        [SerializeField] private float _daySunIntensity = 1.35f;
        [SerializeField] private Vector3 _daySunAngles = new Vector3(50f, -35f, 0f);

        [Header("Night Moonlight")]
        [SerializeField] private Color _nightMoonColor = new Color(0.55f, 0.65f, 0.85f);
        [SerializeField] private float _nightMoonIntensity = 0.20f;
        [SerializeField] private Vector3 _nightMoonAngles = new Vector3(65f, 140f, 0f);

        [Header("Stadium Floodlights")]
        [SerializeField] private Light[] _floodlights = new Light[4];
        [SerializeField] private Color _floodlightColor = new Color(0.95f, 0.98f, 1.0f);
        [SerializeField] private float _floodlightIntensity = 3800f; // Lumens / Candela in URP

        [Header("Shadow Settings & Mobile Scalability")]
        [SerializeField] private bool _enableShadows = true;
        [SerializeField] private LightShadows _desktopShadowType = LightShadows.Soft;
        [SerializeField] private LightShadows _mobileShadowType = LightShadows.Hard;

        public StadiumAtmosphere CurrentAtmosphere => _currentAtmosphere;

        private void Awake()
        {
            ApplyAtmosphere(_currentAtmosphere);
            ConfigureMobileShadows();
        }

        public void SetAtmosphere(StadiumAtmosphere atmosphere)
        {
            _currentAtmosphere = atmosphere;
            ApplyAtmosphere(_currentAtmosphere);
        }

        private void ApplyAtmosphere(StadiumAtmosphere atmosphere)
        {
            bool isNight = atmosphere == StadiumAtmosphere.NightFloodlights;

            // 1. Primary Directional Light
            if (_sunLight != null)
            {
                _sunLight.color = isNight ? _nightMoonColor : _daySunColor;
                _sunLight.intensity = isNight ? _nightMoonIntensity : _daySunIntensity;
                _sunLight.transform.rotation = Quaternion.Euler(isNight ? _nightMoonAngles : _daySunAngles);
                _sunLight.shadows = _enableShadows ? (Application.isMobilePlatform ? _mobileShadowType : _desktopShadowType) : LightShadows.None;
            }

            // 2. Ambient Sky Color
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = isNight ? new Color(0.08f, 0.12f, 0.20f) : new Color(0.60f, 0.68f, 0.75f);

            // 3. Floodlights (Only active in Night mode, or subtle fill in Day)
            if (_floodlights != null)
            {
                for (int i = 0; i < _floodlights.Length; i++)
                {
                    if (_floodlights[i] != null)
                    {
                        _floodlights[i].enabled = isNight;
                        _floodlights[i].color = _floodlightColor;
                        _floodlights[i].intensity = _floodlightIntensity;
                        // Never cast shadows from multiple floodlights to maintain 60 FPS on mobile!
                        _floodlights[i].shadows = LightShadows.None;
                    }
                }
            }

            CricketLogger.LogInfo(LogChannel.Core, $"Stadium Atmosphere updated to: [{atmosphere}]");
        }

        public void ConfigureMobileShadows()
        {
            if (Application.isMobilePlatform)
            {
                QualitySettings.shadowDistance = 45f;
                QualitySettings.shadowCascades = 1;
            }
            else
            {
                QualitySettings.shadowDistance = 120f;
                QualitySettings.shadowCascades = 4;
            }
        }

        public void SetFloodlightsReference(Light[] lights)
        {
            _floodlights = lights;
            ApplyAtmosphere(_currentAtmosphere);
        }

        public void SetSunLightReference(Light sun)
        {
            _sunLight = sun;
            ApplyAtmosphere(_currentAtmosphere);
        }
    }
}
