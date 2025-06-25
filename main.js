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
let modelCamera = null; // Store camera from GLB model

// Initialize the 3D scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera settings - edit these values to change the view
    const cameraSettings = {
        position: { x: 0.00, y: 1.28, z: 0.00 },
        rotation: { x: -90, y: 0, z: 0.05 } // in degrees
    };
    
    // Create camera with position and rotation values
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(
        cameraSettings.position.x, 
        cameraSettings.position.y, 
        cameraSettings.position.z
    );
    
    // Set rotation in radians (converting from degrees)
    camera.rotation.x = cameraSettings.rotation.x * Math.PI / 180;
    camera.rotation.y = cameraSettings.rotation.y * Math.PI / 180;
    camera.rotation.z = cameraSettings.rotation.z * Math.PI / 180;

    // Create renderer with flat shading
    sceneContainer = document.getElementById('scene-container');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = false; // Disable shadows for flat appearance
    renderer.outputEncoding = THREE.LinearEncoding; // Use linear encoding for flat appearance
    renderer.physicallyCorrectLights = false; // Disable physically correct lighting
    sceneContainer.appendChild(renderer.domElement);

    // Add moderate ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    // Add directional light from top
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(0, 10, 0); // Light from directly above
    scene.add(directionalLight);
    
    // We'll align this light with the camera position once the model loads

    // Store default camera settings for reset - uses same values as cameraSettings
    const defaultCameraPosition = { x: cameraSettings.position.x, y: cameraSettings.position.y, z: cameraSettings.position.z };
    const defaultCameraRotation = { 
        x: cameraSettings.rotation.x * Math.PI / 180, 
        y: cameraSettings.rotation.y * Math.PI / 180, 
        z: cameraSettings.rotation.z * Math.PI / 180 
    };
    
    // Add orbit controls with rotation locked
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = false; // Disable rotation
    controls.enablePan = true; // Allow panning (moving around)
    controls.enableZoom = true; // Allow zooming
    
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

// Create a text sprite
function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.18)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Text
    context.font = 'bold 16px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture,
        sizeAttenuation: true,
        depthTest: false,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.2, 0.1, 0.2);
    sprite.center.set(0.5, 0); // Align bottom center of sprite with pivot point
    
    return sprite;
}

// Load the GLB model
function loadModel() {
    // Show loading overlay
    document.getElementById('loading-overlay').style.display = 'flex';
    
    const loader = new THREE.GLTFLoader();
    loader.load(
        'scener.glb',
        function (gltf) {
            model = gltf.scene;
            scene.add(model);
            
            // Hide loading overlay when model is loaded
            document.getElementById('loading-overlay').style.display = 'none';
            
            console.log('Model loaded, structure:', model);
            
            // Adjust materials for better appearance with top-down lighting
            model.traverse(function(node) {
                if (node.isMesh && node.material) {
                    // Handle both single materials and material arrays
                    if (Array.isArray(node.material)) {
                        node.material.forEach(material => {
                            // Keep original materials but adjust properties
                            if (material.map) {
                                // Ensure textures are displayed properly
                                material.map.encoding = THREE.LinearEncoding;
                            }
                            // Reduce specular highlights
                            if (material.shininess !== undefined) {
                                material.shininess = 5; // Lower shininess
                            }
                            // For PBR materials
                            if (material.metalness !== undefined) {
                                material.metalness = 0.1;
                                material.roughness = 0.8;
                            }
                        });
                    } else {
                        // Keep original material but adjust properties
                        if (node.material.map) {
                            // Ensure textures are displayed properly
                            node.material.map.encoding = THREE.LinearEncoding;
                        }
                        // Reduce specular highlights
                        if (node.material.shininess !== undefined) {
                            node.material.shininess = 5; // Lower shininess
                        }
                        // For PBR materials
                        if (node.material.metalness !== undefined) {
                            node.material.metalness = 0.1;
                            node.material.roughness = 0.8;
                        }
                    }
                }
            });
            
            // Find the floor groups
            model.traverse(function (child) {
                console.log('Traversing child:', child.name, child.type);
                
                // Find Camera object in the model
                if (child.name === 'Camera') {
                    modelCamera = child;
                    console.log('Found Camera in model:', modelCamera);
                    
                    // Use model camera position and rotation for main camera
                    camera.position.copy(modelCamera.position);
                    camera.rotation.copy(modelCamera.rotation);
                    
                    // Update the default camera settings for reset function
                    defaultCameraPosition.x = modelCamera.position.x;
                    defaultCameraPosition.y = modelCamera.position.y;
                    defaultCameraPosition.z = modelCamera.position.z;
                    
                    defaultCameraRotation.x = modelCamera.rotation.x;
                    defaultCameraRotation.y = modelCamera.rotation.y;
                    defaultCameraRotation.z = modelCamera.rotation.z;
                    
                    // Align directional light with camera position
                    // Position light slightly above and in front of camera
                    const cameraDirection = new THREE.Vector3(0, 0, -1);
                    cameraDirection.applyQuaternion(modelCamera.quaternion);
                    
                    // Position light 5 units above camera in the direction it's facing
                    directionalLight.position.copy(modelCamera.position);
                    directionalLight.position.y += 5; // Light from above
                    directionalLight.target.position.copy(modelCamera.position);
                    directionalLight.target.position.add(cameraDirection);
                    scene.add(directionalLight.target); // Important: add target to scene
                    
                    console.log('Aligned directional light with camera');
                    
                    // Update controls
                    controls.update();
                    
                    console.log('Applied model camera position:', 
                        modelCamera.position.x.toFixed(2),
                        modelCamera.position.y.toFixed(2),
                        modelCamera.position.z.toFixed(2),
                        '| Rotation:',
                        (modelCamera.rotation.x * 180 / Math.PI).toFixed(2) + '°',
                        (modelCamera.rotation.y * 180 / Math.PI).toFixed(2) + '°',
                        (modelCamera.rotation.z * 180 / Math.PI).toFixed(2) + '°'
                    );
                }
                
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
                            
                            // Add "Click View" text label above checkpoint
                            const textSprite = createTextSprite("Chọn Để Xem");
                            textSprite.position.set(0, 0.1, 0); // Position aligned with checkpoint pivot
                            floorChild.add(textSprite);
                        }
                    });
                    
                    // If no checkpoints were found, create fallback clickable areas
                    if (Object.keys(checkpoints).length === 0) {
                        console.log('No checkpoints found, creating fallback clickable areas');
                        
                        // Create 5 checkpoint spheres
                        for (let i = 1; i <= 5; i++) {
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
                            
                            // Add "Click View" text label above checkpoint
                            const textSprite = createTextSprite("Chọn Để Xem");
                            textSprite.position.set(0, 0.15, 0); // Position aligned with checkpoint pivot
                            checkpointMesh.add(textSprite);
                            
                            console.log(`Created fallback ${checkpointName}, linked to Panorama${i}.png`);
                        }
                    }
                } else if (child.name === 'Floor_02') {
                    floor02 = child;
                    floor02.visible = false;
                    
                    // Look for checkpointViewImages in Floor_02
                    floor02.traverse(function(floorChild) {
                        // Add text sprites for specific view points
                        if (floorChild.name === 'checkpointViewImages1') {
                            const textSprite = createTextSprite("View P.Hoc");
                            textSprite.position.set(0, 0.5, 0); // Position above the mesh
                            floorChild.add(textSprite);
                            console.log('Added text sprite for checkpointViewImages1');
                        }
                        else if (floorChild.name === 'checkpointViewImages2') {
                            const textSprite = createTextSprite("View Hoi Truong");
                            textSprite.position.set(0, 0.5, 0); // Position above the mesh
                            floorChild.add(textSprite);
                            console.log('Added text sprite for checkpointViewImages2');
                        }
                    });
                    
                    // Look for checkpoints within Floor_02
                    floor02.traverse(function(floorChild) {
                        if (floorChild.name && floorChild.name.includes('checkpoint')) {
                            // Skip adding text to checkpointViewImages1 and checkpointViewImages2 as they have custom text
                            if (floorChild.name === 'checkpointViewImages1' || floorChild.name === 'checkpointViewImages2') {
                                return;
                            }
                            
                            const checkpointNumber = floorChild.name.match(/\d+/); // Extract number from name
                            const checkpointId = checkpointNumber ? parseInt(checkpointNumber[0]) : 1;
                            
                            checkpoints[floorChild.name] = {
                                mesh: floorChild,
                                panoramaPath: `panorama/floor2/Panorama${checkpointId}.png`
                            };
                            
                            console.log(`Found ${floorChild.name} in Floor_02, linked to Panorama${checkpointId}.png`);
                            
                            // Add a highlight material to make it more visible
                            if (floorChild.material) {
                                floorChild.userData.originalMaterial = floorChild.material.clone();
                                floorChild.material = new THREE.MeshBasicMaterial({ 
                                    color: 0xff0000,
                                    opacity: 0.7,
                                    transparent: true
                                });
                            } else {
                                floorChild.material = new THREE.MeshBasicMaterial({ 
                                    color: 0xff0000,
                                    opacity: 0.7,
                                    transparent: true
                                });
                            }
                            
                            // Add "Click View" text label above checkpoint
                            const textSprite = createTextSprite("Chọn Để Xem");
                            textSprite.position.set(0, 0.1, 0); // Position aligned with checkpoint pivot
                            floorChild.add(textSprite);
                        }
                    });
                } else if (child.name === 'Floor_03') {
                    floor03 = child;
                    floor03.visible = false;
                    
                    // Look for checkpoints within Floor_03
                    floor03.traverse(function(floorChild) {
                        if (floorChild.name && floorChild.name.includes('checkpoint')) {
                            const checkpointNumber = floorChild.name.match(/\d+/); // Extract number from name
                            const checkpointId = checkpointNumber ? parseInt(checkpointNumber[0]) : 1;
                            
                            checkpoints[floorChild.name] = {
                                mesh: floorChild,
                                panoramaPath: `panorama/floor3/Panorama${checkpointId}.png`
                            };
                            
                            console.log(`Found ${floorChild.name} in Floor_03, linked to Panorama${checkpointId}.png`);
                            
                            // Add a highlight material to make it more visible
                            if (floorChild.material) {
                                floorChild.userData.originalMaterial = floorChild.material.clone();
                                floorChild.material = new THREE.MeshBasicMaterial({ 
                                    color: 0xff0000,
                                    opacity: 0.7,
                                    transparent: true
                                });
                            } else {
                                floorChild.material = new THREE.MeshBasicMaterial({ 
                                    color: 0xff0000,
                                    opacity: 0.7,
                                    transparent: true
                                });
                            }
                            
                            // Add "Click View" text label above checkpoint
                            const textSprite = createTextSprite("Chọn Để Xem");
                            textSprite.position.set(0, 0.1, 0); // Position aligned with checkpoint pivot
                            floorChild.add(textSprite);
                        }
                    });
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
                    
                    // Add "Click View" text label above checkpoint
                    const textSprite = createTextSprite("Chọn Để Xem");
                    textSprite.position.set(0, 0.1, 0); // Position aligned with checkpoint pivot
                    child.add(textSprite);
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
                
                // Show loading overlay with "Đang tải..." message
                const loadingOverlay = document.getElementById('loading-overlay');
                loadingOverlay.style.display = 'flex';
                
                // Open panorama
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
    
    // Set camera position and rotation
    panoramaCamera.position.set(0.79, 0.09, 0.60);
    
    // Convert degrees to radians for rotation
    const radX = -8.39 * (Math.PI / 180);
    const radY = 52.52 * (Math.PI / 180);
    const radZ = 6.68 * (Math.PI / 180);
    
    // Apply rotation
    panoramaCamera.rotation.set(radX, radY, radZ);
    
    // Store as default view
    defaultViews[currentPanoramaPath] = {
        position: panoramaCamera.position.clone(),
        rotation: {
            x: radX,
            y: radY,
            z: radZ
        }
    };
    
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
    panoramaControls.rotateSpeed = 0.5; // Increased for better manual rotation
    panoramaControls.zoomSpeed = 20; // Adjust zoom speed
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
    
    // Support all panoramas (1-5)
    console.log('Loading panorama:', panoramaPath);
    
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
            
            // Apply default view if available, otherwise use the hardcoded default view
            if (!defaultViews[panoramaPath]) {
                // Set default view for this panorama if it doesn't exist
                defaultViews[panoramaPath] = {
                    position: new THREE.Vector3(0.79, 0.09, 0.60),
                    rotation: {
                        x: -8.39 * (Math.PI / 180),
                        y: 52.52 * (Math.PI / 180),
                        z: 6.68 * (Math.PI / 180)
                    }
                };
            }
            
            // Apply the view
            const view = defaultViews[panoramaPath];
            panoramaCamera.position.copy(view.position);
            panoramaCamera.rotation.set(view.rotation.x, view.rotation.y, view.rotation.z);
            console.log('Applied view for', panoramaPath, ':', 
                'Position:', view.position.x.toFixed(2), view.position.y.toFixed(2), view.position.z.toFixed(2),
                '| Rotation:', (view.rotation.x * 180 / Math.PI).toFixed(2) + '°',
                (view.rotation.y * 180 / Math.PI).toFixed(2) + '°',
                (view.rotation.z * 180 / Math.PI).toFixed(2) + '°'
            );
            
            // Set initial control settings
            panoramaControls.autoRotate = false;
            panoramaControls.autoRotateSpeed = 1.0;
            document.getElementById('auto-rotate').textContent = 'Tự Động Xoay';
            
            panoramaControls.update();
            
            // Hide loading overlay
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.style.display = 'none';
            
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
