'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export const DATA_NODES = [
  {
    id: 'GP',
    label: 'Graphics Programming',
    description:
      'Master rendering pipelines, shaders, OpenGL/Vulkan, and real-time 3D graphics engines from beginner to expert.',
  },
  {
    id: 'CV',
    label: 'Computer Vision',
    description:
      'Explore image processing, object detection, and visual models to enable machines to interpret visual data.',
  },
  {
    id: 'SYS',
    label: 'System Design',
    description:
      'Architect robust distributed systems, manage cloud infrastructure, and master high-availability backend administration.',
  },
  {
    id: 'MOB',
    label: 'Mobile App Dev',
    description:
      'Build cross-platform and native mobile applications focusing on performance, UI/UX, and state management.',
  },
  {
    id: 'NLP',
    label: 'Natural Language Processing',
    description:
      'Dive into NLP, text generation, transformers, and the semantic understanding of human languages.',
  },
  {
    id: 'RAG',
    label: 'Agentic AI & RAG',
    description:
      'Design autonomous AI agents and Retrieval-Augmented Generation flows using modern LLM orchestration.',
  },
  {
    id: 'RL',
    label: 'Reinforcement Learning',
    description:
      'Train models through reward/penalty paradigms, diving into Q-learning, policy gradients, and agents.',
  },
  {
    id: 'PAR',
    label: 'Concurrency Parallelism',
    description:
      'Master multi-threading, concurrency models, asynchronous programming, and CPU/GPU-accelerated processing.',
  },
  {
    id: 'WEB',
    label: 'Full-Stack Web',
    description:
      'Engineer modern web experiences from responsive frontends to scalable microservice backends.',
  },
  {
    id: 'CP',
    label: 'Competitive Programming',
    description:
      'Sharpen algorithmic intuition and master complex data structures under strict time and memory constraints.',
  },
  {
    id: 'AI',
    label: 'Machine Learning',
    description:
      'Train predictive models, neural networks, and deep learning architectures to extract insights from datasets.',
  },
  {
    id: 'SEC',
    label: 'Cyber Security',
    description:
      'Understand penetration testing, network defense, cryptography, and zero-trust security architectures.',
  },
  {
    id: 'W3',
    label: 'Web3 Blockchain',
    description:
      'Develop decentralized applications, smart contracts, and cryptographic ledger systems on modern blockchains.',
  },
];

const NODE_ICONS = {
  GP: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>',
  CV: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>',
  SYS: '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"></rect><rect width="20" height="8" x="2" y="14" rx="2" ry="2"></rect><line x1="6" x2="6.01" y1="6" y2="6"></line><line x1="6" x2="6.01" y1="18" y2="18"></line>',
  MOB: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect><path d="M12 18h.01"></path>',
  NLP: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
  RAG: '<path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path>',
  RL: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>',
  PAR: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>',
  WEB: '<circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path>',
  CP: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>',
  AI: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>',
  SEC: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
  W3: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
};

const MULTILINE_CODE_SNIPPETS = [
  '#include <iostream>\nusing namespace std;\n\nint main() {\n  int n, m; adj[1e5];\n  vector<int> f(n);\n  return (1);\n}',
  'void dfs(int u, int p) {\n  if (visited) continue;\n  cint a = Alfevents;\n  return v > parents + 1;\n}',
  'void main() {\n  if (visited) return;\n  else {\n    return adj[e][0];\n  }\n}',
  'int main() {\n  int n, a;\n  if(visited) std;\n  return 0;\n}',
  'vec3 color = p * 0.5;\nfloat d = length(p);\nconst vec3 vVec = vec(0.);',
  'function init() {\n  const ctx = null;\n  return rgba(255,10);\n}',
];

export default function Hero3DCanvas({ onNodeClick } = {}) {
  const mountRef = useRef(null);
  const onNodeClickRef = useRef(onNodeClick);

  const interactionState = useRef({
    isDragging: false,
    dragDistance: 0,
    previousPosition: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
  });

  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  const handlePointerDown = (e) => {
    interactionState.current.isDragging = true;
    interactionState.current.dragDistance = 0;
    interactionState.current.previousPosition = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!interactionState.current.isDragging) return;
    const deltaX = e.clientX - interactionState.current.previousPosition.x;
    const deltaY = e.clientY - interactionState.current.previousPosition.y;
    interactionState.current.dragDistance += Math.sqrt(
      deltaX * deltaX + deltaY * deltaY
    );
    interactionState.current.velocity.y = Math.max(
      -0.15,
      Math.min(0.15, deltaX * 0.005)
    );
    interactionState.current.velocity.x = Math.max(
      -0.15,
      Math.min(0.15, deltaY * 0.005)
    );
    interactionState.current.previousPosition = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e) => {
    interactionState.current.isDragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
      60,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 32;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountEl.appendChild(renderer.domElement);

    const renderScene = new RenderPass(scene, camera);
    renderScene.clearColor = new THREE.Color(0x000000);
    renderScene.clearAlpha = 0;

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mountEl.clientWidth, mountEl.clientHeight),
      0.9,
      0.8,
      0.2
    );
    bloomPass.clearColor = new THREE.Color(0x000000);

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const coreRadius = 10.5;

    const innerGeo = new THREE.IcosahedronGeometry(coreRadius * 0.98, 3);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x020205,
      transparent: true,
      opacity: 0.1,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    worldGroup.add(innerSphere);

    const geo = new THREE.IcosahedronGeometry(coreRadius, 2);
    const edges = new THREE.EdgesGeometry(geo);

    const posAttr = edges.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    edges.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });
    const sphereLines = new THREE.LineSegments(edges, lineMat);
    worldGroup.add(sphereLines);

    const pointsGeo = new THREE.BufferGeometry().setAttribute(
      'position',
      geo.attributes.position
    );
    const pointsColors = new Float32Array(geo.attributes.position.count * 3);
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(pointsColors, 3));

    const pointsMat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.NormalBlending,
    });
    const points = new THREE.Points(pointsGeo, pointsMat);
    worldGroup.add(points);

    const createNodeTexture = (symbol, text, isCyan) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const themeColor = isCyan
        ? 'rgba(0, 242, 255, 1)'
        : 'rgba(188, 19, 254, 1)';
      const darkColor = isCyan
        ? 'rgba(0, 242, 255, 0.15)'
        : 'rgba(188, 19, 254, 0.15)';
      const textColor = 'rgba(255, 255, 255, 0.9)';

      const cx = 256;
      const cy = 200;

      const gradient = ctx.createRadialGradient(cx, cy, 30, cx, cy, 70);
      gradient.addColorStop(0, darkColor);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 54, 0, Math.PI * 2);
      ctx.strokeStyle = darkColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 48, Math.PI * 0.1, Math.PI * 0.9);
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 48, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = darkColor;
      ctx.stroke();

      const texture = new THREE.CanvasTexture(canvas);

      const svgPath = NODE_ICONS[symbol];
      if (svgPath) {
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${themeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`;
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, cx - 20, cy - 20, 40, 40);
          texture.needsUpdate = true;
        };
        img.src =
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      }

      ctx.font = '400 22px "Inter", "JetBrains Mono", sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const words = text.toUpperCase().split(' ');
      let line1 = '';
      let line2 = '';

      if (words.length > 2) {
        line1 = words.slice(0, 2).join(' ');
        line2 = words.slice(2).join(' ');
      } else if (words.length === 2) {
        line1 = words[0];
        line2 = words[1];
      } else {
        line1 = words[0];
      }

      ctx.fillText(line1, cx, cy + 90);
      if (line2) {
        ctx.font = '300 18px "Inter", "JetBrains Mono", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(line2, cx, cy + 118);
      }

      texture.minFilter = THREE.LinearFilter;
      return texture;
    };

    const nodeSprites = [];
    DATA_NODES.forEach((node, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / DATA_NODES.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const px = coreRadius * Math.sin(phi) * Math.cos(theta);
      const py = coreRadius * Math.cos(phi);
      const pz = coreRadius * Math.sin(phi) * Math.sin(theta);

      const texCyan = createNodeTexture(node.id, node.label, true);
      const texPurple = createNodeTexture(node.id, node.label, false);
      if (!texCyan || !texPurple) return;

      const mat = new THREE.SpriteMaterial({
        map: texCyan,
        blending: THREE.NormalBlending,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(px, py, pz);
      sprite.scale.set(5.0, 5.0, 1);

      sprite.userData.texCyan = texCyan;
      sprite.userData.texPurple = texPurple;
      sprite.userData.nodeData = node;

      worldGroup.add(sprite);
      nodeSprites.push(sprite);
    });

    const networkGeo = new THREE.BufferGeometry();
    const networkPos = [];
    for (let i = 0; i < nodeSprites.length; i++) {
      for (let j = i + 1; j < nodeSprites.length; j++) {
        const d = nodeSprites[i].position.distanceTo(nodeSprites[j].position);
        if (d < coreRadius * 1.8) {
          networkPos.push(
            nodeSprites[i].position.x,
            nodeSprites[i].position.y,
            nodeSprites[i].position.z,
            nodeSprites[j].position.x,
            nodeSprites[j].position.y,
            nodeSprites[j].position.z
          );
        }
      }
    }
    networkGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(networkPos, 3)
    );
    const networkMat = new THREE.LineBasicMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });
    const networkLines = new THREE.LineSegments(networkGeo, networkMat);
    worldGroup.add(networkLines);

    const createSnippetTexture = (text, isCyan) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillStyle = isCyan
        ? 'rgba(0, 242, 255, 0.7)'
        : 'rgba(188, 19, 254, 0.7)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      ctx.shadowColor = isCyan ? 'rgba(0,242,255,0.4)' : 'rgba(188,19,254,0.4)';
      ctx.shadowBlur = 8;

      const lines = text.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, 16, 16 + i * 20);
      });

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      return tex;
    };

    const extendedSnippets = [
      ...MULTILINE_CODE_SNIPPETS,
      ...MULTILINE_CODE_SNIPPETS,
    ];
    const snippetMeshes = [];
    const snippetData = extendedSnippets
      .map((text, i) => {
        const isCyan = i % 2 === 0;
        const tex = createSnippetTexture(text, isCyan);
        if (!tex) return null;

        const snippetGeo = new THREE.PlaneGeometry(12, 6);
        const snippetMat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(snippetGeo, snippetMat);
        const pos = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(60),
          THREE.MathUtils.randFloatSpread(50),
          THREE.MathUtils.randFloat(-20, 10)
        );
        mesh.position.copy(pos);
        mesh.rotation.x = THREE.MathUtils.randFloatSpread(0.2);
        mesh.rotation.y = THREE.MathUtils.randFloatSpread(0.2);
        mesh.rotation.z = THREE.MathUtils.randFloatSpread(0.1);

        scene.add(mesh);
        snippetMeshes.push(mesh);

        return {
          mesh,
          pos,
          velocity: new THREE.Vector3(0, 0, 0),
          baseSpeed: THREE.MathUtils.randFloat(0.015, 0.04),
          mass: THREE.MathUtils.randFloat(0.5, 1.5),
          wobbleSpeed: THREE.MathUtils.randFloat(0.5, 2.0),
          wobbleOffset: Math.random() * Math.PI * 2,
        };
      })
      .filter(Boolean);

    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const mouse3D = new THREE.Vector3();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9999, -9999);
    let hoveredNode = null;

    const onScenePointerMove = (event) => {
      const rect = mountEl.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onScenePointerLeave = () => {
      mouse.set(-9999, -9999);
    };

    const onSceneClick = () => {
      if (interactionState.current.dragDistance > 5) return;
      if (hoveredNode && onNodeClickRef.current) {
        onNodeClickRef.current(hoveredNode.userData.nodeData);
      }
    };

    mountEl.addEventListener('pointermove', onScenePointerMove);
    mountEl.addEventListener('pointerleave', onScenePointerLeave);
    mountEl.addEventListener('pointerup', onSceneClick);

    const colorCyan = new THREE.Color(0x00f2ff);
    const colorPurple = new THREE.Color(0xbc13fe);
    const tempVec = new THREE.Vector3();
    const tempColor = new THREE.Color();
    const targetScaleVec = new THREE.Vector3();

    let animationId;
    const clock = new THREE.Clock();

    function animate() {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const fpsScale = Math.min(2, delta * 60);

      if (!interactionState.current.isDragging) {
        const factor = Math.pow(0.965, fpsScale);
        interactionState.current.velocity.x *= factor;
        interactionState.current.velocity.y *= factor;
        interactionState.current.velocity.y += 0.00015 * fpsScale;
      }

      worldGroup.rotation.x += interactionState.current.velocity.x * fpsScale;
      worldGroup.rotation.y += interactionState.current.velocity.y * fpsScale;

      sphereLines.updateMatrixWorld();

      const wireframePos = edges.attributes.position;
      const wireframeColors = edges.attributes.color;
      for (let i = 0; i < wireframePos.count; i++) {
        tempVec.fromBufferAttribute(wireframePos, i);
        tempVec.applyMatrix4(worldGroup.matrixWorld);

        const t = THREE.MathUtils.clamp(
          (tempVec.x + coreRadius) / (coreRadius * 2.0),
          0,
          1
        );
        tempColor.copy(colorCyan).lerp(colorPurple, t);
        wireframeColors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
      }
      wireframeColors.needsUpdate = true;

      const ptPos = pointsGeo.attributes.position;
      const ptColors = pointsGeo.attributes.color;
      for (let i = 0; i < ptPos.count; i++) {
        tempVec.fromBufferAttribute(ptPos, i);
        tempVec.applyMatrix4(worldGroup.matrixWorld);
        const t = THREE.MathUtils.clamp(
          (tempVec.x + coreRadius) / (coreRadius * 2.0),
          0,
          1
        );
        tempColor.copy(colorCyan).lerp(colorPurple, t);
        ptColors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
      }
      ptColors.needsUpdate = true;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeSprites);

      if (intersects.length > 0) {
        if (hoveredNode !== intersects[0].object) {
          hoveredNode = intersects[0].object;
          mountEl.style.cursor = 'pointer';
        }
      } else if (hoveredNode) {
        hoveredNode = null;
        mountEl.style.cursor = interactionState.current.isDragging
          ? 'grabbing'
          : 'grab';
      }

      const timeSec = Date.now() * 0.001;

      worldGroup.position.y = Math.sin(timeSec * 0.4) * 0.2;

      nodeSprites.forEach((s, i) => {
        tempVec.copy(s.position).applyMatrix4(worldGroup.matrixWorld);

        const isLeft = tempVec.x < 0;
        s.material.map = isLeft ? s.userData.texCyan : s.userData.texPurple;

        let targetScale = 5.0 + Math.sin(timeSec + i) * 0.2;
        let targetOpacity = 0.65;

        if (hoveredNode) {
          if (hoveredNode === s) {
            targetScale *= 1.35;
            targetOpacity = 1;
          } else {
            targetOpacity = 0.2;
          }
        }

        targetScaleVec.set(targetScale, targetScale, 1);
        s.scale.lerp(targetScaleVec, 0.15);
        s.material.opacity += (targetOpacity - s.material.opacity) * 0.1;
      });

      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(targetPlane, mouse3D);

      snippetData.forEach((data, i) => {
        data.velocity.y += (data.baseSpeed - data.velocity.y) * 0.05 * fpsScale;

        if (mouse.x !== -9999) {
          tempVec.copy(data.pos).sub(mouse3D);
          const dist = tempVec.length();
          const influenceRadius = 25;
          if (dist < influenceRadius) {
            const force = Math.pow(
              (influenceRadius - dist) / influenceRadius,
              2
            );
            tempVec
              .normalize()
              .multiplyScalar((force * 0.25 * fpsScale) / data.mass);
            data.velocity.add(tempVec);
          }
        }

        data.velocity.x += (0 - data.pos.x) * 0.0005 * fpsScale;

        data.velocity.x *= Math.pow(0.92, fpsScale);
        data.velocity.z *= Math.pow(0.92, fpsScale);

        data.pos.add(data.velocity);

        const wobbleX =
          Math.sin(timeSec * data.wobbleSpeed + data.wobbleOffset) *
          0.01 *
          fpsScale;
        data.pos.x += wobbleX;

        if (data.pos.y > 30) {
          data.pos.y = -30;
          data.pos.x = THREE.MathUtils.randFloatSpread(60);
          data.velocity.set(0, 0, 0);
        }
        if (data.pos.y < -30) data.pos.y = 30;

        data.mesh.position.copy(data.pos);

        data.mesh.rotation.y = THREE.MathUtils.lerp(
          data.mesh.rotation.y,
          data.velocity.x * -2.0,
          0.1 * fpsScale
        );
        data.mesh.rotation.x = THREE.MathUtils.lerp(
          data.mesh.rotation.x,
          data.velocity.y * 1.5,
          0.1 * fpsScale
        );

        const pulse = Math.max(0.1, 0.65 + Math.sin(timeSec * 0.5 + i) * 0.35);
        data.mesh.material.opacity = pulse;
      });

      composer.render();
    }

    animate();

    const handleResize = () => {
      renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
      composer.setSize(mountEl.clientWidth, mountEl.clientHeight);
      bloomPass.setSize(mountEl.clientWidth, mountEl.clientHeight);
      camera.aspect = mountEl.clientWidth / mountEl.clientHeight;
      camera.updateProjectionMatrix();
    };

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(mountEl);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      mountEl.removeEventListener('pointermove', onScenePointerMove);
      mountEl.removeEventListener('pointerleave', onScenePointerLeave);
      mountEl.removeEventListener('pointerup', onSceneClick);

      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }

      cancelAnimationFrame(animationId);

      geo.dispose();
      edges.dispose();
      lineMat.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      networkGeo.dispose();
      networkMat.dispose();
      nodeSprites.forEach((s) => {
        if (s.userData.texCyan) s.userData.texCyan.dispose();
        if (s.userData.texPurple) s.userData.texPurple.dispose();
        s.material.dispose();
      });

      snippetMeshes.forEach((mesh) => {
        if (mesh.material && mesh.material.map) {
          mesh.material.map.dispose();
        }
        if (mesh.material) mesh.material.dispose();
        if (mesh.geometry) mesh.geometry.dispose();
      });

      renderer.dispose();
      composer.dispose();
      if (mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-10 h-full w-full overflow-hidden bg-transparent"
      style={{ touchAction: 'none' }}
    >
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={(e) => {
          handlePointerUp(e);
          if (mountRef.current) mountRef.current.style.cursor = 'grab';
        }}
        className="absolute inset-0 z-0 h-full w-full outline-none"
      />
    </div>
  );
}
