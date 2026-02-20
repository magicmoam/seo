// hero-scene.js - Three.js 3D hero scene (glass TorusKnot + gold rings)

export class HeroScene {
  constructor(container) {
    this._container = container;
    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._controls = null;
    this._clock = null;
    this._animFrameId = null;
    this._heroGroup = null;
    this._mainMesh = null;
    this._ring1 = null;
    this._ring2 = null;
    this._mouseX = 0;
    this._mouseY = 0;
    this._windowHalfX = window.innerWidth / 2;
    this._windowHalfY = window.innerHeight / 2;
    this._onMouseMove = null;
    this._onResize = null;
  }

  init(THREE, OrbitControls) {
    const webglContainer = this._container.querySelector('#webgl-container');
    if (!webglContainer) return;

    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0xF0F0EB, 0.02);

    this._camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this._camera.position.set(0, 0, 8);

    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    webglContainer.appendChild(this._renderer.domElement);

    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.enableDamping = true;
    this._controls.dampingFactor = 0.03;
    this._controls.enableZoom = false;
    this._controls.autoRotate = true;
    this._controls.autoRotateSpeed = 1.5;
    this._controls.maxPolarAngle = Math.PI / 1.5;
    this._controls.minPolarAngle = Math.PI / 3;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this._scene.add(ambientLight);

    const mainSpot = new THREE.SpotLight(0xffffff, 20);
    mainSpot.position.set(5, 5, 5);
    mainSpot.angle = 0.4;
    mainSpot.penumbra = 0.3;
    mainSpot.castShadow = true;
    mainSpot.shadow.bias = -0.0001;
    this._scene.add(mainSpot);

    const fillLight = new THREE.PointLight(0xE6D5B8, 10);
    fillLight.position.set(-5, 0, 2);
    this._scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xd4eaff, 5);
    backLight.position.set(0, 5, -5);
    this._scene.add(backLight);

    this._heroGroup = new THREE.Group();
    this._scene.add(this._heroGroup);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.95,
      thickness: 1.5,
      ior: 1.7,
      dispersion: 0.4,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 1.0,
      roughness: 0.15,
    });

    const geometry = new THREE.TorusKnotGeometry(1.2, 0.3, 150, 20, 2, 3);
    this._mainMesh = new THREE.Mesh(geometry, glassMaterial);
    this._mainMesh.castShadow = true;
    this._mainMesh.receiveShadow = true;
    this._heroGroup.add(this._mainMesh);

    const ringGeo = new THREE.TorusGeometry(2.5, 0.02, 16, 100);
    this._ring1 = new THREE.Mesh(ringGeo, goldMaterial);
    this._ring1.rotation.x = Math.PI / 1.8;
    this._heroGroup.add(this._ring1);

    this._ring2 = new THREE.Mesh(ringGeo, goldMaterial);
    this._ring2.rotation.x = Math.PI / 2.2;
    this._ring2.rotation.y = Math.PI / 4;
    this._ring2.scale.set(0.8, 0.8, 0.8);
    this._heroGroup.add(this._ring2);

    const particleGeo = new THREE.IcosahedronGeometry(0.05, 0);
    for (let i = 0; i < 30; i++) {
      const particle = new THREE.Mesh(particleGeo, goldMaterial);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 2 + Math.random() * 2;
      particle.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      particle.userData = {
        angle: theta,
        radius: radius,
        speed: 0.005 + Math.random() * 0.01,
        yOffset: Math.random() * Math.PI
      };
      this._heroGroup.add(particle);
    }

    this._windowHalfX = window.innerWidth / 2;
    this._windowHalfY = window.innerHeight / 2;

    this._onMouseMove = (event) => {
      this._mouseX = (event.clientX - this._windowHalfX) * 0.0005;
      this._mouseY = (event.clientY - this._windowHalfY) * 0.0005;
    };
    document.addEventListener('mousemove', this._onMouseMove);

    this._clock = new THREE.Clock();
    this._animate();

    this._onResize = () => {
      this._windowHalfX = window.innerWidth / 2;
      this._windowHalfY = window.innerHeight / 2;
      this._camera.aspect = window.innerWidth / window.innerHeight;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this._onResize);
  }

  _animate() {
    this._animFrameId = requestAnimationFrame(() => this._animate());
    const time = this._clock.getElapsedTime();
    this._controls.update();

    this._heroGroup.rotation.y += (this._mouseX - this._heroGroup.rotation.y) * 0.05;
    this._heroGroup.rotation.x += (this._mouseY - this._heroGroup.rotation.x) * 0.05;
    this._mainMesh.rotation.z = Math.sin(time * 0.2) * 0.1;
    this._ring1.rotation.z += 0.002;
    this._ring2.rotation.z -= 0.003;

    this._heroGroup.children.forEach((child) => {
      if (child.userData.speed) {
        child.userData.angle += child.userData.speed;
        child.position.x = child.userData.radius * Math.cos(child.userData.angle);
        child.position.z = child.userData.radius * Math.sin(child.userData.angle);
        child.position.y += Math.sin(time + child.userData.yOffset) * 0.002;
        child.rotation.x += 0.02;
        child.rotation.y += 0.02;
      }
    });

    this._renderer.render(this._scene, this._camera);
  }

  destroy() {
    if (this._animFrameId != null) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }

    if (this._onMouseMove) {
      document.removeEventListener('mousemove', this._onMouseMove);
      this._onMouseMove = null;
    }
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }

    if (this._controls) {
      this._controls.dispose();
      this._controls = null;
    }

    if (this._renderer) {
      this._renderer.dispose();
      this._renderer.domElement.remove();
      this._renderer = null;
    }

    if (this._scene) {
      this._scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this._scene = null;
    }

    this._camera = null;
    this._clock = null;
    this._heroGroup = null;
    this._mainMesh = null;
    this._ring1 = null;
    this._ring2 = null;
  }
}
