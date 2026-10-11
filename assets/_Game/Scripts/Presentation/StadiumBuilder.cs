using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.Presentation
{
    /// <summary>
    /// Procedurally constructs and manages the 3D Cricket Oval Stadium:
    /// - Two-tone alternating lawn mown grass rings
    /// - Central pitch strip (22.56m x 3.05m) with MCC popping, bowling, and return creases
    /// - 30-yard fielding circle with white disc markers
    /// - Boundary rope with visible sponsors/cones
    /// - Dual sets of wickets and bails (striker & bowler ends)
    /// - Stadium grandstand bowl with aisles, seating tiers, and low-overhead crowd representation
    /// - 4 tall floodlight towers with spotlights
    /// </summary>
    public class StadiumBuilder : MonoBehaviour
    {
        [Header("Material References (Optional or Generated)")]
        [SerializeField] private Material _grassMaterialLight;
        [SerializeField] private Material _grassMaterialDark;
        [SerializeField] private Material _pitchMaterial;
        [SerializeField] private Material _creaseLineMaterial;
        [SerializeField] private Material _woodMaterial;
        [SerializeField] private Material _ropeMaterial;
        [SerializeField] private Material _concreteMaterial;
        [SerializeField] private Material _crowdMaterial;

        [Header("Wickets Controllers")]
        [SerializeField] private WicketsController _strikerWickets;
        [SerializeField] private WicketsController _bowlerWickets;

        [Header("Lighting")]
        [SerializeField] private StadiumLightingManager _lightingManager;

        public WicketsController StrikerWickets => _strikerWickets;
        public WicketsController BowlerWickets => _bowlerWickets;

        private void Awake()
        {
            EnsureMaterials();
            BuildStadium();
        }

        private void EnsureMaterials()
        {
            Shader uLitShader = Shader.Find("Universal Render Pipeline/Lit");
            if (uLitShader == null) uLitShader = Shader.Find("Standard");

            if (_grassMaterialLight == null)
            {
                _grassMaterialLight = new Material(uLitShader) { color = new Color(0.22f, 0.58f, 0.22f) };
                _grassMaterialLight.name = "Mat_Grass_Light";
            }

            if (_grassMaterialDark == null)
            {
                _grassMaterialDark = new Material(uLitShader) { color = new Color(0.18f, 0.49f, 0.18f) };
                _grassMaterialDark.name = "Mat_Grass_Dark";
            }

            if (_pitchMaterial == null)
            {
                _pitchMaterial = new Material(uLitShader) { color = new Color(0.81f, 0.72f, 0.54f) };
                _pitchMaterial.name = "Mat_Pitch_Turf";
            }

            if (_creaseLineMaterial == null)
            {
                _creaseLineMaterial = new Material(uLitShader) { color = Color.white };
                _creaseLineMaterial.name = "Mat_Crease_Line";
            }

            if (_woodMaterial == null)
            {
                _woodMaterial = new Material(uLitShader) { color = new Color(0.88f, 0.74f, 0.42f) };
                _woodMaterial.name = "Mat_Wood_Varnish";
            }

            if (_ropeMaterial == null)
            {
                _ropeMaterial = new Material(uLitShader) { color = new Color(0.95f, 0.95f, 0.95f) };
                _ropeMaterial.name = "Mat_Boundary_Rope";
            }

            if (_concreteMaterial == null)
            {
                _concreteMaterial = new Material(uLitShader) { color = new Color(0.24f, 0.28f, 0.32f) };
                _concreteMaterial.name = "Mat_Concrete_Stands";
            }

            if (_crowdMaterial == null)
            {
                _crowdMaterial = new Material(uLitShader) { color = new Color(0.35f, 0.45f, 0.65f) };
                _crowdMaterial.name = "Mat_Crowd_Tier";
            }
        }

        public void BuildStadium()
        {
            CricketLogger.LogInfo(LogChannel.Core, "Procedurally generating Cricket Legends 3D Stadium...");

            BuildOutfield();
            BuildPitchAndCreases();
            BuildThirtyYardCircle();
            BuildBoundaryRope();
            BuildWickets();
            BuildStadiumStandsAndCrowd();
            BuildFloodlightTowers();

            CricketLogger.LogInfo(LogChannel.Core, "Stadium generation complete.");
        }

        // --- 1. Two-Tone Outfield ---
        private void BuildOutfield()
        {
            GameObject outfieldRoot = new GameObject("Outfield_Oval");
            outfieldRoot.transform.SetParent(transform);

            int numRings = 8;
            float maxR = PitchCoordinates.BoundaryRadiusZ;

            for (int i = 0; i < numRings; i++)
            {
                float innerR = i * (maxR / numRings);
                float outerR = (i + 1) * (maxR / numRings);
                Material mat = (i % 2 == 0) ? _grassMaterialLight : _grassMaterialDark;

                GameObject ringObj = CreateEllipticalRing($"LawnRing_{i}", innerR, outerR, 48, mat);
                ringObj.transform.SetParent(outfieldRoot.transform);
                ringObj.transform.localPosition = new Vector3(0, -0.01f, 0);
            }
        }

        // --- 2. Central Pitch Strip & Crease Markings ---
        private void BuildPitchAndCreases()
        {
            GameObject pitchRoot = new GameObject("Central_Pitch");
            pitchRoot.transform.SetParent(transform);

            // Pitch Surface
            GameObject pitchQuad = GameObject.CreatePrimitive(PrimitiveType.Cube);
            pitchQuad.name = "Pitch_Turf_Strip";
            pitchQuad.transform.SetParent(pitchRoot.transform);
            pitchQuad.transform.localPosition = new Vector3(0, -0.02f, 0);
            pitchQuad.transform.localScale = new Vector3(
                PitchCoordinates.PitchTurfWidth,
                PitchCoordinates.PitchTurfThickness,
                PitchCoordinates.PitchTotalTurfLength
            );
            pitchQuad.GetComponent<Renderer>().sharedMaterial = _pitchMaterial;

            // Creases at both ends (+Z Striker, -Z Bowler)
            CreateCreaseSet(pitchRoot.transform, 1f, "Striker");
            CreateCreaseSet(pitchRoot.transform, -1f, "Bowler");
        }

        private void CreateCreaseSet(Transform parent, float zSign, string endName)
        {
            float bowlingCreaseZ = zSign * PitchCoordinates.PitchHalfLength;
            float poppingCreaseZ = zSign * (PitchCoordinates.PitchHalfLength - PitchCoordinates.PoppingCreaseOffsetFromWicket);

            // 1. Popping Crease Line (White bar across pitch)
            CreateCreaseBar(parent, $"{endName}_PoppingCrease",
                new Vector3(0, 0.015f, poppingCreaseZ),
                new Vector3(PitchCoordinates.PitchTurfWidth * 1.15f, 0.01f, PitchCoordinates.CreaseLineWidth));

            // 2. Bowling Crease Line (2.64m wide passing through stumps)
            CreateCreaseBar(parent, $"{endName}_BowlingCrease",
                new Vector3(0, 0.015f, bowlingCreaseZ),
                new Vector3(PitchCoordinates.BowlingCreaseWidth, 0.01f, PitchCoordinates.CreaseLineWidth));

            // 3. Return Creases (2 lines perpendicular to bowling crease at ±1.32m)
            float returnZ = zSign * (PitchCoordinates.PitchHalfLength + 0.6f);
            CreateCreaseBar(parent, $"{endName}_ReturnCrease_Left",
                new Vector3(-PitchCoordinates.ReturnCreaseHalfWidth, 0.015f, returnZ),
                new Vector3(PitchCoordinates.CreaseLineWidth, 0.01f, 2.44f));

            CreateCreaseBar(parent, $"{endName}_ReturnCrease_Right",
                new Vector3(PitchCoordinates.ReturnCreaseHalfWidth, 0.015f, returnZ),
                new Vector3(PitchCoordinates.CreaseLineWidth, 0.01f, 2.44f));
        }

        private void CreateCreaseBar(Transform parent, string name, Vector3 pos, Vector3 scale)
        {
            GameObject bar = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bar.name = name;
            bar.transform.SetParent(parent);
            bar.transform.localPosition = pos;
            bar.transform.localScale = scale;
            bar.GetComponent<Renderer>().sharedMaterial = _creaseLineMaterial;
            DestroyImmediate(bar.GetComponent<Collider>());
        }

        // --- 3. 30-Yard Circle with Marker Discs ---
        private void BuildThirtyYardCircle()
        {
            GameObject circleRoot = new GameObject("Thirty_Yard_Circle");
            circleRoot.transform.SetParent(transform);

            int discCount = 20;
            float radius = PitchCoordinates.ThirtyYardCircleRadius;

            for (int i = 0; i < discCount; i++)
            {
                float angle = i * (Mathf.PI * 2f / discCount);
                Vector3 discPos = new Vector3(Mathf.Cos(angle) * radius, 0.02f, Mathf.Sin(angle) * radius);

                GameObject disc = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                disc.name = $"CircleMarker_{i}";
                disc.transform.SetParent(circleRoot.transform);
                disc.transform.localPosition = discPos;
                disc.transform.localScale = new Vector3(0.44f, 0.02f, 0.44f);
                disc.GetComponent<Renderer>().sharedMaterial = _creaseLineMaterial;
                DestroyImmediate(disc.GetComponent<Collider>());
            }
        }

        // --- 4. Boundary Rope ---
        private void BuildBoundaryRope()
        {
            GameObject ropeRoot = new GameObject("Boundary_Rope");
            ropeRoot.transform.SetParent(transform);

            int segments = 48;
            for (int i = 0; i < segments; i++)
            {
                float a1 = i * (Mathf.PI * 2f / segments);
                float a2 = (i + 1) * (Mathf.PI * 2f / segments);

                Vector3 p1 = new Vector3(Mathf.Cos(a1) * PitchCoordinates.BoundaryRadiusX, 0.06f, Mathf.Sin(a1) * PitchCoordinates.BoundaryRadiusZ);
                Vector3 p2 = new Vector3(Mathf.Cos(a2) * PitchCoordinates.BoundaryRadiusX, 0.06f, Mathf.Sin(a2) * PitchCoordinates.BoundaryRadiusZ);

                GameObject seg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                seg.name = $"RopeSeg_{i}";
                seg.transform.SetParent(ropeRoot.transform);
                seg.transform.localPosition = (p1 + p2) * 0.5f;
                seg.transform.LookAt(p2);
                seg.transform.Rotate(90f, 0f, 0f);

                float len = Vector3.Distance(p1, p2);
                seg.transform.localScale = new Vector3(0.12f, len * 0.5f, 0.12f);
                seg.GetComponent<Renderer>().sharedMaterial = _ropeMaterial;
            }
        }

        // --- 5. Two Sets of Wickets & Bails ---
        private void BuildWickets()
        {
            GameObject wicketsRoot = new GameObject("Wickets");
            wicketsRoot.transform.SetParent(transform);

            // 1. Striker's Wicket (+10.06m)
            GameObject strikerObj = new GameObject("Wickets_StrikerEnd");
            strikerObj.transform.SetParent(wicketsRoot.transform);
            strikerObj.transform.localPosition = PitchCoordinates.StrikerWicketsPosition;
            _strikerWickets = strikerObj.AddComponent<WicketsController>();
            _strikerWickets.SetupProceduralWicketStructure(_woodMaterial);

            // 2. Bowler's Wicket (-10.06m)
            GameObject bowlerObj = new GameObject("Wickets_BowlerEnd");
            bowlerObj.transform.SetParent(wicketsRoot.transform);
            bowlerObj.transform.localPosition = PitchCoordinates.BowlerWicketsPosition;
            _bowlerWickets = bowlerObj.AddComponent<WicketsController>();
            _bowlerWickets.SetupProceduralWicketStructure(_woodMaterial);
        }

        // --- 6. Stadium Stands & Low-Overhead Crowd ---
        private void BuildStadiumStandsAndCrowd()
        {
            GameObject standsRoot = new GameObject("Stadium_Grandstands");
            standsRoot.transform.SetParent(transform);

            int tiers = 4;
            float innerR = PitchCoordinates.StadiumStandsInnerRadius;
            float stepR = (PitchCoordinates.StadiumStandsOuterRadius - innerR) / tiers;
            float stepH = PitchCoordinates.StadiumStandsHeight / tiers;

            for (int t = 0; t < tiers; t++)
            {
                float r1 = innerR + t * stepR;
                float r2 = r1 + stepR;
                float yPos = t * stepH;

                // Concrete Tier Step
                GameObject tierMesh = CreateEllipticalRing($"StandTier_{t}", r1, r2, 36, _concreteMaterial);
                tierMesh.transform.SetParent(standsRoot.transform);
                tierMesh.transform.localPosition = new Vector3(0, yPos, 0);

                // Crowd Spectator Band (High-performance color-blocked crowd ribbon)
                GameObject crowdBand = CreateEllipticalRing($"CrowdBand_{t}", r1 + 0.4f, r2 - 0.4f, 36, _crowdMaterial);
                crowdBand.transform.SetParent(standsRoot.transform);
                crowdBand.transform.localPosition = new Vector3(0, yPos + 0.15f, 0);
            }
        }

        // --- 7. Four Floodlight Towers ---
        private void BuildFloodlightTowers()
        {
            GameObject towersRoot = new GameObject("Floodlight_Towers");
            towersRoot.transform.SetParent(transform);

            float d = PitchCoordinates.FloodlightDistance * 0.707f;
            Vector3[] towerPositions = {
                new Vector3(d, 0, d),
                new Vector3(-d, 0, d),
                new Vector3(d, 0, -d),
                new Vector3(-d, 0, -d)
            };

            Light[] spotLights = new Light[4];

            for (int i = 0; i < 4; i++)
            {
                GameObject tower = new GameObject($"FloodlightTower_{i + 1}");
                tower.transform.SetParent(towersRoot.transform);
                tower.transform.localPosition = towerPositions[i];

                // Lattice Mast Pole
                GameObject mast = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                mast.name = "MastPole";
                mast.transform.SetParent(tower.transform);
                mast.transform.localPosition = new Vector3(0, PitchCoordinates.FloodlightTowerHeight * 0.5f, 0);
                mast.transform.localScale = new Vector3(1.6f, PitchCoordinates.FloodlightTowerHeight * 0.5f, 1.6f);
                mast.GetComponent<Renderer>().sharedMaterial = _concreteMaterial;

                // Floodlight Head Array
                GameObject head = GameObject.CreatePrimitive(PrimitiveType.Cube);
                head.name = "LightHead";
                head.transform.SetParent(tower.transform);
                head.transform.localPosition = new Vector3(0, PitchCoordinates.FloodlightTowerHeight + 2f, 0);
                head.transform.localScale = new Vector3(8.0f, 4.0f, 1.5f);
                head.transform.LookAt(Vector3.up * 8f);
                head.GetComponent<Renderer>().sharedMaterial = _creaseLineMaterial;

                // High-performance spotlight
                GameObject lightObj = new GameObject("SpotLight");
                lightObj.transform.SetParent(head.transform);
                lightObj.transform.localPosition = Vector3.forward * 1.0f;
                lightObj.transform.localRotation = Quaternion.identity;

                Light spot = lightObj.AddComponent<Light>();
                spot.type = LightType.Spot;
                spot.range = 140f;
                spot.spotAngle = 60f;
                spot.intensity = 3800f;
                spot.color = new Color(0.95f, 0.98f, 1.0f);
                spot.shadows = LightShadows.None; // Never cast dynamic shadows from 4 floodlights
                spot.enabled = false;

                spotLights[i] = spot;
            }

            if (_lightingManager != null)
            {
                _lightingManager.SetFloodlightsReference(spotLights);
            }
        }

        private GameObject CreateEllipticalRing(string name, float innerR, float outerR, int segments, Material mat)
        {
            GameObject obj = new GameObject(name);
            MeshFilter filter = obj.AddComponent<MeshFilter>();
            MeshRenderer renderer = obj.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = mat;

            Mesh mesh = new Mesh { name = $"{name}_Mesh" };

            Vector3[] vertices = new Vector3[segments * 2];
            int[] triangles = new int[segments * 6];

            float scaleX = PitchCoordinates.BoundaryRadiusX / PitchCoordinates.BoundaryRadiusZ;

            for (int i = 0; i < segments; i++)
            {
                float theta = i * (Mathf.PI * 2f / segments);
                float cos = Mathf.Cos(theta);
                float sin = Mathf.Sin(theta);

                vertices[i * 2] = new Vector3(cos * innerR * scaleX, 0, sin * innerR);
                vertices[i * 2 + 1] = new Vector3(cos * outerR * scaleX, 0, sin * outerR);

                int next = (i + 1) % segments;
                int t = i * 6;

                triangles[t] = i * 2;
                triangles[t + 1] = next * 2;
                triangles[t + 2] = i * 2 + 1;

                triangles[t + 3] = next * 2;
                triangles[t + 4] = next * 2 + 1;
                triangles[t + 5] = i * 2 + 1;
            }

            mesh.vertices = vertices;
            mesh.triangles = triangles;
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();

            filter.sharedMesh = mesh;
            return obj;
        }
    }
}
