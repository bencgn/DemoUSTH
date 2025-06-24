// Main variables
let scene, camera, renderer, controls;
let floorModel;
const floorCollections = {
    'Floor_01': null,
    'Floor_02': null,
    'Floor_03': null
};

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Create camera
    camera = new THREE.PerspectiveCamera(
        75, // Field of view
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near clipping plane
        1000 // Far clipping plane
    );
    camera.position.set(5, 5, 5);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    
    // Add renderer to DOM
    const container = document.getElementById('scene-container');
    container.appendChild(renderer.domElement);

    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load the GLB model
    loadModel();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Set up floor button event listeners
    setupFloorButtons();

    // Start animation loop
    animate();
}

// Load the GLB model
function loadModel() {
    const loader = new THREE.GLTFLoader();
    
    // Show loading message (in a real app, you might want a loading spinner)
    console.log('Loading 3D model...');
    
    loader.load(
        // Resource URL
        'scener.glb',
        
        // Called when the resource is loaded
        function(gltf) {
            floorModel = gltf.scene;
            scene.add(floorModel);
            
            // Find and store references to floor collections
            floorModel.traverse(function(child) {
                if (child.name === 'Floor_01') {
                    floorCollections['Floor_01'] = child;
                    child.visible = true; // Floor 1 visible by default
                } else if (child.name === 'Floor_02') {
                    floorCollections['Floor_02'] = child;
                    child.visible = false; // Hidden by default
                } else if (child.name === 'Floor_03') {
                    floorCollections['Floor_03'] = child;
                    child.visible = false; // Hidden by default
                }
            });
            
            // Center camera on model
            centerCameraOnModel();
            
            console.log('Model loaded successfully');
        },
        
        // Called while loading is progressing
        function(xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        
        // Called when loading has errors
        function(error) {
            console.error('An error happened while loading the model:', error);
        }
    );
}

// Center camera on the loaded model
function centerCameraOnModel() {
    if (!floorModel) return;
    
    // Create a bounding box for the model
    const boundingBox = new THREE.Box3().setFromObject(floorModel);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    
    // Get the max side of the bounding box
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
    
    // Set camera position and target
    camera.position.set(center.x, center.y + maxDim / 3, center.z + cameraZ);
    controls.target.set(center.x, center.y, center.z);
    controls.update();
}

// Set up floor button event listeners
function setupFloorButtons() {
    document.getElementById('floor1').addEventListener('click', () => showFloor('Floor_01'));
    document.getElementById('floor2').addEventListener('click', () => showFloor('Floor_02'));
    document.getElementById('floor3').addEventListener('click', () => showFloor('Floor_03'));
}

// Show selected floor and hide others
function showFloor(floorName) {
    // Update button states
    const buttons = document.querySelectorAll('.floor-btn');
    buttons.forEach(button => button.classList.remove('active'));
    
    const floorNumber = floorName.split('_')[1];
    document.getElementById('floor' + floorNumber.replace('0', '')).classList.add('active');
    
    // Show/hide floor collections
    for (const [name, object] of Object.entries(floorCollections)) {
        if (object) {
            object.visible = (name === floorName);
        }
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', init);
