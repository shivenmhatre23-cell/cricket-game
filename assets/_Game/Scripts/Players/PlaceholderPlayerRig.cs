using UnityEngine;
using CricketLegends.Input;

namespace CricketLegends.Players
{
    public enum PlayerRole
    {
        Batsman,
        Bowler,
        Fielder,
        Wicketkeeper,
        Umpire
    }

    /// <summary>
    /// Proportional primitive-based articulated player rig for Cricket Legends.
    /// Follows standard humanoid bone hierarchy (Hips -> Spine -> Head / Arms / Legs)
    /// allowing drop-in replacement with skinned/rigged FBX humanoid avatars in later phases.
    /// </summary>
    public class PlaceholderPlayerRig : MonoBehaviour
    {
        [Header("Role & Configuration")]
        [SerializeField] private PlayerRole _role = PlayerRole.Batsman;
        [SerializeField] private Color _kitColor = new Color(0.12f, 0.42f, 0.85f); // Team Blue
        [SerializeField] private Color _padsColor = Color.white;

        [Header("Bone Transform Hierarchy (Humanoid-Ready)")]
        [SerializeField] private Transform _hips;
        [SerializeField] private Transform _spine;
        [SerializeField] private Transform _head;
        [SerializeField] private Transform _leftArm;
        [SerializeField] private Transform _rightArm;
        [SerializeField] private Transform _leftLeg;
        [SerializeField] private Transform _rightLeg;
        [SerializeField] private Transform _batMount;

        public PlayerRole Role => _role;
        public Transform BatMount => _batMount;

        private void Awake()
        {
            if (_hips == null)
            {
                BuildArticulatedRig();
            }
        }

        public void SetKitColor(Color color)
        {
            _kitColor = color;
            ApplyMaterials();
        }

        /// <summary>
        /// Constructs a humanoid-proportioned 1.82m tall athletic cricket player silhouette.
        /// </summary>
        public void BuildArticulatedRig()
        {
            // Clear existing children
            while (transform.childCount > 0)
            {
                DestroyImmediate(transform.GetChild(0).gameObject);
            }

            Shader uLit = Shader.Find("Universal Render Pipeline/Lit");
            if (uLit == null) uLit = Shader.Find("Standard");

            Material kitMat = new Material(uLit) { color = _kitColor, name = "Mat_Player_Kit" };
            Material skinMat = new Material(uLit) { color = new Color(0.88f, 0.72f, 0.58f), name = "Mat_Skin" };
            Material padMat = new Material(uLit) { color = _padsColor, name = "Mat_Pads" };
            Material woodMat = new Material(uLit) { color = new Color(0.85f, 0.70f, 0.40f), name = "Mat_Willow" };

            // 1. Hips (Root bone at Y = 0.95m)
            GameObject hipsObj = new GameObject("Hips");
            hipsObj.transform.SetParent(transform);
            hipsObj.transform.localPosition = new Vector3(0, 0.95f, 0);
            _hips = hipsObj.transform;

            // Pelvis Mesh
            CreatePart("Pelvis", _hips, new Vector3(0, 0, 0), new Vector3(0.34f, 0.18f, 0.22f), kitMat, PrimitiveType.Cube);

            // 2. Spine & Torso (Y = 0.32m from Hips -> Total Y = 1.27m)
            GameObject spineObj = new GameObject("Spine");
            spineObj.transform.SetParent(_hips);
            spineObj.transform.localPosition = new Vector3(0, 0.32f, 0);
            _spine = spineObj.transform;

            CreatePart("Torso", _spine, new Vector3(0, 0, 0), new Vector3(0.42f, 0.46f, 0.26f), kitMat, PrimitiveType.Cube);

            // 3. Head & Helmet (Y = 0.38m from Spine -> Total Y = 1.65m to 1.82m)
            GameObject headObj = new GameObject("Head");
            headObj.transform.SetParent(_spine);
            headObj.transform.localPosition = new Vector3(0, 0.38f, 0);
            _head = headObj.transform;

            CreatePart("Face", _head, new Vector3(0, 0, 0), new Vector3(0.20f, 0.22f, 0.20f), skinMat, PrimitiveType.Sphere);
            // Helmet Visor / Grille
            CreatePart("HelmetPeak", _head, new Vector3(0, 0.05f, 0.12f), new Vector3(0.22f, 0.04f, 0.14f), kitMat, PrimitiveType.Cube);

            // 4. Arms & Hands
            // Left Arm
            GameObject lArmObj = new GameObject("LeftArm");
            lArmObj.transform.SetParent(_spine);
            lArmObj.transform.localPosition = new Vector3(-0.28f, 0.15f, 0);
            _leftArm = lArmObj.transform;
            CreatePart("LeftArmMesh", _leftArm, new Vector3(0, -0.22f, 0), new Vector3(0.11f, 0.42f, 0.11f), kitMat, PrimitiveType.Cylinder);

            // Right Arm
            GameObject rArmObj = new GameObject("RightArm");
            rArmObj.transform.SetParent(_spine);
            rArmObj.transform.localPosition = new Vector3(0.28f, 0.15f, 0);
            _rightArm = rArmObj.transform;
            CreatePart("RightArmMesh", _rightArm, new Vector3(0, -0.22f, 0), new Vector3(0.11f, 0.42f, 0.11f), kitMat, PrimitiveType.Cylinder);

            // 5. Legs & Batting Pads
            // Left Leg
            GameObject lLegObj = new GameObject("LeftLeg");
            lLegObj.transform.SetParent(_hips);
            lLegObj.transform.localPosition = new Vector3(-0.14f, -0.10f, 0);
            _leftLeg = lLegObj.transform;
            CreatePart("LeftThigh", _leftLeg, new Vector3(0, -0.22f, 0), new Vector3(0.14f, 0.44f, 0.14f), kitMat, PrimitiveType.Cylinder);
            CreatePart("LeftPad", _leftLeg, new Vector3(0, -0.58f, 0.04f), new Vector3(0.18f, 0.46f, 0.16f), padMat, PrimitiveType.Cube);

            // Right Leg
            GameObject rLegObj = new GameObject("RightLeg");
            rLegObj.transform.SetParent(_hips);
            rLegObj.transform.localPosition = new Vector3(0.14f, -0.10f, 0);
            _rightLeg = rLegObj.transform;
            CreatePart("RightThigh", _rightLeg, new Vector3(0, -0.22f, 0), new Vector3(0.14f, 0.44f, 0.14f), kitMat, PrimitiveType.Cylinder);
            CreatePart("RightPad", _rightLeg, new Vector3(0, -0.58f, 0.04f), new Vector3(0.18f, 0.46f, 0.16f), padMat, PrimitiveType.Cube);

            // 6. Cricket Bat (Attached to Right Hand for RHB)
            if (_role == PlayerRole.Batsman)
            {
                GameObject batMountObj = new GameObject("BatMountPoint");
                batMountObj.transform.SetParent(_rightArm);
                batMountObj.transform.localPosition = new Vector3(0, -0.44f, 0.10f);
                batMountObj.transform.localRotation = Quaternion.Euler(30f, 0, 0);
                _batMount = batMountObj.transform;

                // Bat Handle (Cylinder)
                CreatePart("BatHandle", _batMount, new Vector3(0, 0.18f, 0), new Vector3(0.04f, 0.32f, 0.04f), padMat, PrimitiveType.Cylinder);
                // Bat Blade (Cube willow wood)
                CreatePart("BatBlade", _batMount, new Vector3(0, -0.26f, 0), new Vector3(0.11f, 0.58f, 0.05f), woodMat, PrimitiveType.Cube);
            }

            ApplyInitialPose();
        }

        private void CreatePart(string name, Transform parent, Vector3 pos, Vector3 scale, Material mat, PrimitiveType prim)
        {
            GameObject part = GameObject.CreatePrimitive(prim);
            part.name = name;
            part.transform.SetParent(parent);
            part.transform.localPosition = pos;
            part.transform.localScale = scale;
            part.GetComponent<Renderer>().sharedMaterial = mat;
            DestroyImmediate(part.GetComponent<Collider>());
        }

        private void ApplyInitialPose()
        {
            if (_role == PlayerRole.Batsman)
            {
                // Crouched batting stance, side-on to bowler
                transform.rotation = Quaternion.Euler(0, 90f, 0); // Side-on chest facing off-side
                if (_leftArm != null) _leftArm.localRotation = Quaternion.Euler(20f, 0, -25f);
                if (_rightArm != null) _rightArm.localRotation = Quaternion.Euler(35f, 0, 20f);
                if (_hips != null) _hips.localPosition = new Vector3(0, 0.90f, 0); // Slight crouch
            }
            else if (_role == PlayerRole.Bowler)
            {
                // Upright bowler ready pose looking down pitch towards striker
                transform.rotation = Quaternion.Euler(0, 0, 0);
                if (_leftArm != null) _leftArm.localRotation = Quaternion.Euler(-10f, 0, 0);
                if (_rightArm != null) _rightArm.localRotation = Quaternion.Euler(25f, 0, 0); // Ball in right hand
            }
        }

        private void ApplyMaterials()
        {
            // Update kit colors dynamically
            Renderer[] renderers = GetComponentsInChildren<Renderer>();
            foreach (var r in renderers)
            {
                if (r.sharedMaterial != null && r.sharedMaterial.name.Contains("Kit"))
                {
                    r.material.color = _kitColor;
                }
            }
        }
    }
}
