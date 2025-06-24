// Global variables
let scene, camera, renderer, controls;
let model, floor01, floor02, floor03;
let raycaster, mouse;
let checkpoints = {}; // Object to store all checkpoints
let panoramaScene, panoramaCamera, panoramaRenderer, panoramaControls;
let panoramaContainer, sceneContainer;
let isShowingPanorama = false;
let defaultViews = {}; // Store default views for each panorama
let currentPanoramaPath = ''; // Track current panorama

// Initialize the 3D scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Create camera with exact position and rotation values
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0.00, 1.28, 0.00); // Exact position from logs
    
    // Set exact rotation in radians (converting from degrees)
    camera.rotation.x = -90 * Math.PI / 180; // -90 degrees in radians
    camera.rotation.y = 0;
    camera.rotation.z = 0.05 * Math.PI / 180; // 0.05 degrees in radians

    // Create renderer
    sceneContainer = document.getElementById('scene-container');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    sceneContainer.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Store default camera settings for reset
    const defaultCameraPosition = { x: 0.00, y: 1.28, z: 0.00 };
    const defaultCameraRotation = { 
        x: -90 * Math.PI / 180, 
        y: 0, 
        z: 0.05 * Math.PI / 180 
    };
    
    // Add orbit controls with rotation locked
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = false; // Disable rotation
    controls.enablePan = true; // Allow panning (moving around)
    controls.enableZoom = true; // Allow zooming
    
    // Add reset button to UI
    const uiContainer = document.getElementById('ui');
    const resetViewBtn = document.createElement('button');
    resetViewBtn.textContent = 'Reset View';
    resetViewBtn.className = 'floor-btn reset-btn';
    resetViewBtn.addEventListener('click', resetCameraView);
    uiContainer.appendChild(resetViewBtn);
    
    // Function to reset camera to default view
    function resetCameraView() {
        camera.position.set(defaultCameraPosition.x, defaultCameraPosition.y, defaultCameraPosition.z);
        camera.rotation.set(defaultCameraRotation.x, defaultCameraRotation.y, defaultCameraRotation.z);
        controls.update();
    }

    // Setup raycaster for detecting clicks
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Initialize panorama container
    panoramaContainer = document.getElementById('panorama-container');

    // Load the 3D model
    loadModel();

    // Setup event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onClick);
    setupFloorButtons();

    // Start animation loop
    animate();
}

// Load the GLB model
function loadModel() {
    const loader = new THREE.GLTFLoader();
    loader.load(
        'scener.glb',
        function (gltf) {
            model = gltf.scene;
            scene.add(model);
            
            console.log('Model loaded, structure:', model);
            
            // Find the floor groups
            model.traverse(function (child) {
                console.log('Traversing child:', child.name, child.type);
                
                if (child.name === 'Floor_01') {
                    floor01 = child;
                    console.log('Found Floor_01:', floor01);
                    
                    // Look for checkpoints within Floor_01
                    floor01.traverse(function(floorChild) {
                        // Check for any mesh with 'checkpoint' in its name
                        if (floorChild.name && floorChild.name.includes('checkpoint')) {
                            const checkpointNumber = floorChild.name.match(/\d+/); // Extract number from name
                            const checkpointId = checkpointNumber ? parseInt(checkpointNumber[0]) : 1;
                            
                            checkpoints[floorChild.name] = {
                                mesh: floorChild,
                                panoramaPath: `panorama/floor1/Panorama${checkpointId}.png`
                            };
                            
                            console.log(`Found ${floorChild.name} in Floor_01, linked to Panorama${checkpointId}.png`);
                            
                            // Add a highlight material to make it more visible
                            if (floorChild.material) {
                                floorChild.userData.originalMaterial = floorChild.material.clone();
                                floorChild.material = new THREE.MeshBasicMaterial({ 
                                    color: 0xff0000,
                                    opacity: 0.7,
                                    transparent: true
                                });
                            } else {
                                // If no material exists, create one
                                floorChild.material = new THREE.MeshBasicMaterial({ 
                                    color: 0xff0000,
                                    opacity: 0.7,
                                    transparent: true
                                });
                            }
                        }
                    });
                    
                    // If no checkpoints were found, create fallback clickable areas
                    if (Object.keys(checkpoints).length === 0) {
                        console.log('No checkpoints found, creating fallback clickable areas');
                        
                        // Create 3 checkpoint spheres (matching available panorama files)
                        for (let i = 1; i <= 3; i++) {
                            const checkpointMesh = new THREE.Mesh(
                                new THREE.SphereGeometry(0.3, 32, 32),
                                new THREE.MeshBasicMaterial({ 
                                    color: 0xff0000,
                                    opacity: 0.7,
                                    transparent: true
                                })
                            );
                            
                            const checkpointName = `checkpoint${i}`;
                            checkpointMesh.name = checkpointName;
                            
                            // Position them in different locations
                            checkpointMesh.position.set(
                                (i - 3) * 2,  // Spread them horizontally
                                1.5,          // Fixed height
                                i % 2 === 0 ? 1 : -1  // Alternate front/back
                            );
                            
                            floor01.add(checkpointMesh);
                            
                            checkpoints[checkpointName] = {
                                mesh: checkpointMesh,
                                panoramaPath: `panorama/floor1/Panorama${i}.png`
                            };
                            
                            console.log(`Created fallback ${checkpointName}, linked to Panorama${i}.png`);
                        }
                    }
                } else if (child.name === 'Floor_02') {
                    floor02 = child;
                    floor02.visible = false;
                } else if (child.name === 'Floor_03') {
                    floor03 = child;
                    floor03.visible = false;
                } else if (child.name && child.name.includes('checkpoint')) {
                    const checkpointNumber = child.name.match(/\d+/); // Extract number from name
                    const checkpointId = checkpointNumber ? parseInt(checkpointNumber[0]) : 1;
                    
                    checkpoints[child.name] = {
                        mesh: child,
                        panoramaPath: `panorama/floor1/Panorama${checkpointId}.png`
                    };
                    
                    console.log(`Found ${child.name} at top level, linked to Panorama${checkpointId}.png`);
                    
                    // Add a highlight material to make it more visible
                    if (child.material) {
                        child.userData.originalMaterial = child.material.clone();
                        child.material = new THREE.MeshBasicMaterial({ 
                            color: 0xff0000,
                            opacity: 0.7,
                            transparent: true
                        });
                    }
                }
            });

            // Center camera on model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
            
            camera.position.set(center.x, center.y + cameraDistance * 0.5, center.z + cameraDistance);
            camera.lookAt(center);
            controls.target.copy(center);
            controls.update();
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened', error);
        }
    );
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle mouse click
function onClick(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Get all checkpoint meshes
    const checkpointMeshes = Object.values(checkpoints).map(cp => cp.mesh);
    
    if (checkpointMeshes.length > 0) {
        console.log('Checking for intersection with checkpoints');
        // Use intersectObjects with an array of all checkpoint meshes
        const intersects = raycaster.intersectObjects(checkpointMeshes, true);
        
        if (intersects.length > 0) {
            // Find which checkpoint was clicked
            const clickedObject = intersects[0].object;
            let clickedCheckpointName = clickedObject.name;
            
            // If we hit a child of a checkpoint, traverse up to find the checkpoint
            if (!clickedCheckpointName.includes('checkpoint')) {
                let parent = clickedObject.parent;
                while (parent && !parent.name.includes('checkpoint')) {
                    parent = parent.parent;
                }
                if (parent) {
                    clickedCheckpointName = parent.name;
                }
            }
            
            // Find the checkpoint in our collection
            if (checkpoints[clickedCheckpointName]) {
                console.log(`Checkpoint ${clickedCheckpointName} clicked! Opening panorama...`);
                openPanorama(checkpoints[clickedCheckpointName].panoramaPath);
            } else {
                console.log('Clicked object is not in our checkpoints collection:', clickedCheckpointName);
            }
        } else {
            console.log('No intersection with any checkpoint');
        }
    } else {
        console.log('No checkpoints found for click detection');
    }
}

// Initialize panorama scene
function initPanoramaScene() {
    if (panoramaScene) {
        // Clean up existing scene
        while(panoramaScene.children.length > 0){ 
            panoramaScene.remove(panoramaScene.children[0]); 
        }
        return; // Already initialized
    }
    
    // Create a separate scene for panorama
    panoramaScene = new THREE.Scene();
    panoramaCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Create renderer for panorama
    panoramaRenderer = new THREE.WebGLRenderer({ antialias: true });
    panoramaRenderer.setSize(window.innerWidth, window.innerHeight);
    panoramaRenderer.setPixelRatio(window.devicePixelRatio);
    panoramaContainer.appendChild(panoramaRenderer.domElement);
    
    // Add orbit controls for panorama with enhanced manual rotation
    panoramaControls = new THREE.OrbitControls(panoramaCamera, panoramaRenderer.domElement);
    panoramaControls.enableZoom = true; // Enable zoom
    panoramaControls.minDistance = 1; // Minimum zoom distance
    panoramaControls.maxDistance = 100; // Maximum zoom distance
    panoramaControls.enablePan = false;
    panoramaControls.rotateSpeed = 1.0; // Increased for better manual rotation
    panoramaControls.zoomSpeed = 1.2; // Adjust zoom speed
    panoramaControls.enableDamping = true; // Adds smooth inertia to manual rotation
    panoramaControls.dampingFactor = 0.1; // Controls the inertia amount
    
    // Set up UI event listeners
    const exitButton = document.getElementById('exit-panorama');
    const autoRotateButton = document.getElementById('auto-rotate');
    const setDefaultViewButton = document.getElementById('set-default-view');
    
    // Remove any existing event listeners to prevent duplicates
    exitButton.removeEventListener('click', closePanorama);
    
    exitButton.addEventListener('click', function(event) {
        event.stopPropagation(); // Prevent the event from bubbling up
        closePanorama();
    });
    
    autoRotateButton.removeEventListener('click', toggleAutoRotate);
    autoRotateButton.addEventListener('click', toggleAutoRotate);
    
    setDefaultViewButton.removeEventListener('click', saveDefaultView);
    setDefaultViewButton.addEventListener('click', saveDefaultView);
    
    // Make sure the panorama container doesn't block mouse events for controls
    panoramaContainer.style.pointerEvents = 'auto';
    
    // Add window resize handler
    window.addEventListener('resize', onWindowResize);
}

// Save the current view as default for the current panorama
function saveDefaultView(event) {
    event.stopPropagation(); // Prevent the event from bubbling up
    
    if (!currentPanoramaPath) return;
    
    // Save camera position and rotation
    defaultViews[currentPanoramaPath] = {
        position: {
            x: panoramaCamera.position.x,
            y: panoramaCamera.position.y,
            z: panoramaCamera.position.z
        },
        rotation: {
            x: panoramaCamera.rotation.x,
            y: panoramaCamera.rotation.y,
            z: panoramaCamera.rotation.z
        }
    };
    
    console.log('Default view saved for', currentPanoramaPath);
    console.log('Position:', 
        panoramaCamera.position.x.toFixed(2),
        panoramaCamera.position.y.toFixed(2),
        panoramaCamera.position.z.toFixed(2),
        '| Rotation:',
        (panoramaCamera.rotation.x * 180 / Math.PI).toFixed(2) + '°',
        (panoramaCamera.rotation.y * 180 / Math.PI).toFixed(2) + '°',
        (panoramaCamera.rotation.z * 180 / Math.PI).toFixed(2) + '°'
    );
    
    // Visual feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'View Saved!'; 
    button.style.backgroundColor = 'rgba(0, 255, 0, 0.6)';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
    }, 1500);
}

// Open panorama view
function openPanorama(panoramaPath) {
    // Default path if none provided
    panoramaPath = panoramaPath || 'panorama/floor1/Panorama1.png';
    
    // Make sure we only try to load panoramas that exist (1-3)
    if (panoramaPath.includes('Panorama4.png') || panoramaPath.includes('Panorama5.png')) {
        console.log('Panorama file not found, using Panorama1.png as fallback');
        panoramaPath = 'panorama/floor1/Panorama1.png';
    }
    
    // Store current panorama path
    currentPanoramaPath = panoramaPath;
    
    console.log('Opening panorama with path:', panoramaPath);
    
    // Initialize panorama scene if needed
    initPanoramaScene();
    
    // Clear any existing panorama
    while(panoramaScene.children.length > 0){ 
        panoramaScene.remove(panoramaScene.children[0]); 
    }
    
    // Load panorama texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        panoramaPath,
        function(texture) {
            // Create sphere geometry for the panorama
            const geometry = new THREE.SphereGeometry(500, 60, 40);
            // Flip the geometry inside out
            geometry.scale(-1, 1, 1);
            
            const material = new THREE.MeshBasicMaterial({
                map: texture
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            panoramaScene.add(sphere);
            
            // Apply default view if available, otherwise reset to default position
            if (defaultViews[panoramaPath]) {
                const view = defaultViews[panoramaPath];
                panoramaCamera.position.set(view.position.x, view.position.y, view.position.z);
                panoramaCamera.rotation.set(view.rotation.x, view.rotation.y, view.rotation.z);
                console.log('Applied saved default view for', panoramaPath);
            } else {
                // Reset camera to default position
                panoramaCamera.position.set(0, 0, 0);
            }
            
            // Set initial control settings
            panoramaControls.autoRotate = false;
            panoramaControls.autoRotateSpeed = 1.0;
            document.getElementById('auto-rotate').textContent = 'Auto Rotate';
            
            panoramaControls.update();
            
            // Show panorama container
            panoramaContainer.style.display = 'block';
            
            // Start panorama animation
            isShowingPanorama = true;
            animatePanorama();
            
            // Pause main scene controls to prevent conflicts
            controls.enabled = false;
        },
        undefined,
        function(err) {
            console.error('Error loading panorama:', err);
        }
    );
}

// Global variables for position logging
let lastLogTime = 0;
let logInterval = 500; // Log every 500ms

// Animate panorama view
function animatePanorama() {
    if (!isShowingPanorama) return;
    
    requestAnimationFrame(animatePanorama);
    
    // Update controls (this will handle auto-rotation if enabled)
    panoramaControls.update();
    
    // Log camera position and rotation periodically when moving
    const now = Date.now();
    if (now - lastLogTime > logInterval && panoramaControls.update()) {
        const position = panoramaCamera.position;
        const rotation = panoramaCamera.rotation;
        console.log('Camera Position:', 
            position.x.toFixed(2), 
            position.y.toFixed(2), 
            position.z.toFixed(2), 
            '| Rotation:', 
            (rotation.x * 180 / Math.PI).toFixed(2) + '°', 
            (rotation.y * 180 / Math.PI).toFixed(2) + '°', 
            (rotation.z * 180 / Math.PI).toFixed(2) + '°'
        );
        lastLogTime = now;
    }
    
    // Render the panorama scene
    panoramaRenderer.render(panoramaScene, panoramaCamera);
}

// Function to toggle auto-rotation
function toggleAutoRotate(event) {
    event.stopPropagation(); // Prevent the event from bubbling up
    panoramaControls.autoRotate = !panoramaControls.autoRotate;
    event.target.textContent = panoramaControls.autoRotate ? 'Stop Rotation' : 'Auto Rotate';
}

// Handle window resize
function onWindowResize() {
    if (panoramaCamera) {
        panoramaCamera.aspect = window.innerWidth / window.innerHeight;
        panoramaCamera.updateProjectionMatrix();
    }
    
    if (panoramaRenderer) {
        panoramaRenderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Close panorama view
function closePanorama() {
    panoramaContainer.style.display = 'none';
    isShowingPanorama = false;
    controls.enabled = true;
}

// Setup floor switching buttons
function setupFloorButtons() {
    const floor1Btn = document.getElementById('floor-1');
    const floor2Btn = document.getElementById('floor-2');
    const floor3Btn = document.getElementById('floor-3');
    
    floor1Btn.addEventListener('click', () => switchFloor(1));
    floor2Btn.addEventListener('click', () => switchFloor(2));
    floor3Btn.addEventListener('click', () => switchFloor(3));
}

// Switch between floors
function switchFloor(floorNumber) {
    // Update button states
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`floor-${floorNumber}`).classList.add('active');
    
    // Update floor visibility
    if (floor01) floor01.visible = floorNumber === 1;
    if (floor02) floor02.visible = floorNumber === 2;
    if (floor03) floor03.visible = floorNumber === 3;
}

// Variables for main scene position logging
let lastMainSceneLogTime = 0;
let mainSceneLogInterval = 500; // Log every 500ms

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Log camera position and rotation periodically when moving
    const now = Date.now();
    if (now - lastMainSceneLogTime > mainSceneLogInterval && !isShowingPanorama) {
        // Only log if controls were actually updated (camera moved)
        if (controls.update()) {
            const position = camera.position;
            const rotation = camera.rotation;
            console.log('3D Scene Camera Position:', 
                position.x.toFixed(2), 
                position.y.toFixed(2), 
                position.z.toFixed(2), 
                '| Rotation:', 
                (rotation.x * 180 / Math.PI).toFixed(2) + '°', 
                (rotation.y * 180 / Math.PI).toFixed(2) + '°', 
                (rotation.z * 180 / Math.PI).toFixed(2) + '°'
            );
            lastMainSceneLogTime = now;
        }
    }
    
    // Render the scene
    renderer.render(scene, camera);
}

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', init);
