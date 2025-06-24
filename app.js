// Main application script for 3D Floor Plan Viewer

// Initialize Three.js components
let scene, camera, renderer, controls;
let model = null;
let floorGroups = {};

// Initialize the application
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
    const canvas = document.getElementById('viewer');
    renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // Add orbit controls for camera manipulation
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load the GLB model
    loadModel();

    // Set up event listeners for floor buttons
    setupEventListeners();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

// Load the GLB model
function loadModel() {
    const loader = new THREE.GLTFLoader();
    
    loader.load(
        // GLB file path - make sure to place your GLB file in the same directory
        'scener.glb',
        
        // onLoad callback
        function (gltf) {
            model = gltf.scene;
            scene.add(model);

            // Center the model
            centerModel(model);
            
            // Find and organize floor groups
            findFloorGroups(model);
            
            // Show Floor 1 by default
            showFloor('Floor_01');
        },
        
        // onProgress callback
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        
        // onError callback
        function (error) {
            console.error('An error happened while loading the model:', error);
        }
    );
}

// Center the model in the scene
function centerModel(model) {
    // Create a bounding box for the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    
    // Move the model to center
    model.position.sub(center);
    
    // Adjust camera position based on model size
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
    
    // Add some margin
    cameraDistance *= 1.5;
    
    // Position camera
    camera.position.set(cameraDistance, cameraDistance, cameraDistance);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    
    // Update controls target
    controls.target.set(0, 0, 0);
    controls.update();
}

// Find floor groups in the model
function findFloorGroups(model) {
    model.traverse(function (child) {
        // Check if the object name matches our floor naming pattern
        if (child.name.startsWith('Floor_0')) {
            console.log('Found floor group:', child.name);
            floorGroups[child.name] = child;
        }
    });
    
    console.log('Available floor groups:', Object.keys(floorGroups));
}

// Show only the selected floor
function showFloor(floorName) {
    // Hide all floors first
    Object.keys(floorGroups).forEach(key => {
        floorGroups[key].visible = false;
    });
    
    // Show the selected floor
    if (floorGroups[floorName]) {
        floorGroups[floorName].visible = true;
        console.log('Showing floor:', floorName);
    } else {
        console.error('Floor not found:', floorName);
    }
}

// Set up event listeners for floor buttons
function setupEventListeners() {
    document.getElementById('floor1').addEventListener('click', function() {
        showFloor('Floor_01');
        updateActiveButton(this);
    });
    
    document.getElementById('floor2').addEventListener('click', function() {
        showFloor('Floor_02');
        updateActiveButton(this);
    });
    
    document.getElementById('floor3').addEventListener('click', function() {
        showFloor('Floor_03');
        updateActiveButton(this);
    });
}

// Update active button styling
function updateActiveButton(activeButton) {
    // Remove active class from all buttons
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    activeButton.classList.add('active');
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
