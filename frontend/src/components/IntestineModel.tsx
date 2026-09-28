import React, { Suspense } from "react";
import { Bounds, Center, Html, OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const ColorectalAsset: React.FC = () => {
  const model = useLoader(FBXLoader, "/models/intestine.fbx", (loader) => {
    loader.manager.setURLModifier((url) => {
      const textureName = url.includes("Channel_Default Material_Diffuse")
        ? "Channel_Default%20Material_Diffuse.png"
        : url.includes("Channel_Default Material_Normal Map")
          ? "Channel_Default%20Material_Normal%20Map.png"
          : null;
      return textureName ? `/models/textures/${textureName}` : url;
    });
  });

  return (
    <Bounds fit clip observe margin={1.35}>
      <Center>
        <primitive object={model} />
      </Center>
    </Bounds>
  );
};

const ModelLoading: React.FC = () => (
  <Html center className="model-loading-label">Loading 3D model…</Html>
);

export const IntestineModel: React.FC = () => (
  <div className="intestine-model-container colorectal-model-viewer">
    <Canvas
      camera={{ position: [0, 0, 5], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
      aria-label="Interactive 3D colorectal anatomy model"
    >
      <color attach="background" args={["#e5f2fa"]} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[4, 6, 5]} intensity={2.1} />
      <directionalLight position={[-4, -2, -3]} intensity={0.75} color="#a6d9ef" />
      <Suspense fallback={<ModelLoading />}>
        <ColorectalAsset />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={1} maxDistance={80} autoRotate autoRotateSpeed={0.65} />
    </Canvas>
    <div className="colorectal-model-hint" aria-hidden="true">Drag to rotate · Scroll to zoom</div>
  </div>
);
