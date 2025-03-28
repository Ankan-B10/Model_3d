document.addEventListener("DOMContentLoaded", function () {
  // Custom cursor
  const cursor = document.querySelector(".custom-cursor");

  document.addEventListener("mousemove", (e) => {
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";

    const interactiveElements = document.querySelectorAll(
      "a, button, .model-preview"
    );
    const isHovering = [...interactiveElements].some((el) =>
      el.matches(":hover")
    );

    cursor.style.transform = `translate(-50%, -50%) scale(${
      isHovering ? 2 : 1
    })`;
    cursor.style.opacity = isHovering ? "0.7" : "1";
  });

  // 3D Model Viewer with enhanced controls
  let scene, camera, renderer, model, mixer;
  let targetRotationX = 0,
    targetRotationY = 0;
  let isDragging = false;
  let previousMouseX = 0,
    previousMouseY = 0;
  const dampingFactor = 0.05;
  const scrollSensitivity = 0.02;
  const dragSensitivity = 0.01;
  const buttonRotationStep = 0.2;

  // Model paths - UPDATE THESE TO MATCH YOUR ACTUAL FILES
  const modelPaths = {
    "kitchen-faucet": {
      model: "assets/ASSET.gltf",
      scale: 1.0,
      yPosition: -0.5,
      // previewImage: "url('assets/ASSET-preview.jpg')",
    },
    toilet: {
      model: "assets/toilet.gltf",
      scale: 0.8,
      yPosition: -0.3,
      previewImage: "url('assets/toilet-preview.jpg')",
    },
    shower: {
      model: "assets/shower.gltf",
      scale: 0.7,
      yPosition: -0.2,
      previewImage: "url('assets/shower-preview.jpg')",
    },
  };

  // Initialize 3D viewer
  init3DViewer();
  loadModel("kitchen-faucet");

  function init3DViewer() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);

    // Camera setup
    camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(
      document.getElementById("main-model").clientWidth,
      document.getElementById("main-model").clientHeight
    );
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.getElementById("main-model").appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight1.position.set(1, 1, 1);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, 0.5, -1);
    scene.add(directionalLight2);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemisphereLight.position.set(0, 1, 0);
    scene.add(hemisphereLight);

    // Setup interaction controls
    setupInteractionControls();

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      // Apply smooth rotation with damping
      if (model) {
        model.rotation.y +=
          (targetRotationY - model.rotation.y) * dampingFactor;
        model.rotation.x +=
          (targetRotationX - model.rotation.x) * dampingFactor;
      }

      if (mixer) mixer.update(0.016);
      renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    window.addEventListener(
      "resize",
      function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(
          document.getElementById("main-model").clientWidth,
          document.getElementById("main-model").clientHeight
        );
      },
      false
    );
  }

  function setupInteractionControls() {
    const modelContainer = document.getElementById("main-model");

    // Mouse drag rotation
    modelContainer.addEventListener("mousedown", (e) => {
      isDragging = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
      modelContainer.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging && model) {
        const deltaX = e.clientX - previousMouseX;
        const deltaY = e.clientY - previousMouseY;

        targetRotationY += deltaX * dragSensitivity;
        targetRotationX += deltaY * dragSensitivity;

        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      modelContainer.style.cursor = "grab";
    });

    // Mouse wheel rotation (vertical)
    modelContainer.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (model) {
          targetRotationX += e.deltaY * scrollSensitivity;
        }
      },
      { passive: false }
    );

    // Touch support
    modelContainer.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) {
          isDragging = true;
          previousMouseX = e.touches[0].clientX;
          previousMouseY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    modelContainer.addEventListener(
      "touchmove",
      (e) => {
        if (isDragging && e.touches.length === 1 && model) {
          const deltaX = e.touches[0].clientX - previousMouseX;
          const deltaY = e.touches[0].clientY - previousMouseY;

          targetRotationY += deltaX * dragSensitivity;
          targetRotationX += deltaY * dragSensitivity;

          previousMouseX = e.touches[0].clientX;
          previousMouseY = e.touches[0].clientY;

          e.preventDefault();
        }
      },
      { passive: false }
    );

    document.addEventListener("touchend", () => {
      isDragging = false;
    });

    // Rotation buttons
    document.querySelector(".rotate-up").addEventListener("click", () => {
      targetRotationX -= buttonRotationStep;
    });

    document.querySelector(".rotate-down").addEventListener("click", () => {
      targetRotationX += buttonRotationStep;
    });

    document.querySelector(".rotate-left").addEventListener("click", () => {
      targetRotationY -= buttonRotationStep;
    });

    document.querySelector(".rotate-right").addEventListener("click", () => {
      targetRotationY += buttonRotationStep;
    });
  }

  // GLTF model loading function
  function loadModel(modelKey) {
    const loadingElement = document.querySelector(".model-loading");
    loadingElement.style.display = "block";
    loadingElement.textContent = "Loading 3D Model...";

    // Clear previous model
    if (model) {
      scene.remove(model);
      model = null;
    }
    if (mixer) {
      mixer.stopAllAction();
      mixer = null;
    }

    const loader = new THREE.GLTFLoader();
    const modelConfig = modelPaths[modelKey];

    loader.load(
      modelConfig.model,
      (gltf) => {
        model = gltf.scene;
        model.scale.set(
          modelConfig.scale,
          modelConfig.scale,
          modelConfig.scale
        );

        // Center the model properly
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Calculate the model's height
        const modelHeight = size.y;

        // Position the model vertically centered
        model.position.y = -center.y + modelHeight * 0.5;

        scene.add(model);

        // Adjust camera to fit the model
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
        camera.position.z = cameraZ;
        camera.lookAt(center);

        loadingElement.style.display = "none";
      },
      (xhr) => {
        const percentLoaded = ((xhr.loaded / xhr.total) * 100).toFixed(0);
        loadingElement.textContent = `Loading: ${percentLoaded}%`;
      },
      (error) => {
        console.error("Error loading GLTF model:", error);
        loadingElement.textContent = "Error loading model. Check console.";

        // Fallback visualization
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          wireframe: true,
        });
        model = new THREE.Mesh(geometry, material);
        scene.add(model);
      }
    );
  }

  function updatePreviewImages() {
    document.querySelectorAll(".model-preview").forEach((preview, index) => {
      const modelKeys = Object.keys(modelPaths);
      if (index < modelKeys.length) {
        const modelKey = modelKeys[index];
        preview.style.backgroundImage =
          modelPaths[modelKey].previewImage || "none";
      }
    });
  }

  // Product card interactions
  document.querySelectorAll(".model-card").forEach((card) => {
    card.addEventListener("click", function () {
      const modelKey = this.getAttribute("data-model");
      loadModel(modelKey);

      // Update product info
      const productTitle = this.querySelector("h3").textContent;
      document.querySelector(".product-info h1").textContent = productTitle;

      // Smooth scroll to top
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  });

  // Smooth scroll for navigation
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute("href")).scrollIntoView({
        behavior: "smooth",
      });
    });
  });

  // Scroll animations
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);

    gsap.from(".hero", {
      scrollTrigger: {
        trigger: ".similar-models",
        start: "top bottom",
        toggleActions: "play none none none",
      },
      y: 100,
      opacity: 0,
      duration: 1,
    });

    gsap.from(".model-card", {
      scrollTrigger: {
        trigger: ".similar-models",
        start: "top 80%",
        toggleActions: "play none none none",
      },
      y: 50,
      opacity: 0,
      stagger: 0.2,
      duration: 0.8,
    });
  }

  // Initial preview images setup
  updatePreviewImages();
});
