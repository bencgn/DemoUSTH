# 3D Floor Plan Viewer

A simple web-based 3D viewer for displaying floor plans from a GLB file with the ability to switch between different floors.

## Features

- Load and display 3D models in GLB format
- Switch between different floors (Floor 1, Floor 2, Floor 3)
- Interactive 3D controls (rotate, pan, zoom)
- Responsive design

## Setup Instructions

1. Place your GLB file in the same directory as these files and name it `model.glb`
2. Make sure your GLB file contains collections/groups named `Floor_01`, `Floor_02`, and `Floor_03`
3. Open `index.html` in a web browser

## Usage

- The application will load with Floor 1 visible by default
- Click on the floor buttons at the bottom to switch between floors
- Use mouse/touch to interact with the 3D model:
  - Left-click + drag: Rotate the view
  - Right-click + drag: Pan the view
  - Scroll/pinch: Zoom in/out

## Requirements

- Modern web browser with WebGL support
- No server required (can run locally)

## Technical Details

This application uses:
- Three.js for 3D rendering
- GLTFLoader for loading GLB files
- OrbitControls for camera manipulation
