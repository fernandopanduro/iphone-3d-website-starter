import { useRef, useCallback } from "react";

import {
  ViewerApp,
  AssetManagerPlugin,
  GBufferPlugin,
  ProgressivePlugin,
  TonemapPlugin,
  SSRPlugin,
  SSAOPlugin,
  BloomPlugin,
  GammaCorrectionPlugin,
  mobileAndTabletCheck,
} from "webgi";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";
import { scrollAnimation } from "../lib/scroll-animation";
import { forwardRef } from "react";
import { useImperativeHandle } from "react";
import { useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const WebgiViewer = forwardRef((props, ref) => {
  const canvasRef = useRef(null);

  const [viewerRef, setViewerRef] = useState(null);
  const [targetRef, setTargetRef] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [positionRef, setPositionRef] = useState(null);
  const canvasContainerRef = useRef(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [isMobile, setIsMobile] = useState(null);

  useImperativeHandle(ref, () => ({
    triggerPreview() {
      setPreviewMode(true);
      canvasContainerRef.current.style.pointerEvents = "all";
      props.contentRef.current.style.opacity = "0";

      gsap.to(positionRef, {
        x: 13.04,
        y: -2.01,
        z: 2.23,
        duration: 2,
        onUpdate: () => {
          viewerRef.setDirty();
          cameraRef.positionTargetUpdated(true);
        },
      });
      gsap.to(targetRef, { x: 0.11, y: 0, z: 0, duration: 2 });

      viewerRef.scene.activeCamera.setCameraOptions({ controlsEnabled: true });
    },
  }));

  const memorizedScrollAnimation = useCallback(
    ({ position, target, isMobileOrTablet, onUpdate }) => {
      if (position && target && onUpdate) {
        scrollAnimation({ position, target, isMobileOrTablet, onUpdate });
      }
    },
    []
  );

  const setupViewer = useCallback(async () => {
    // Initialize the viewer
    const viewer = new ViewerApp({
      canvas: canvasRef.current,
    });

    setViewerRef(viewer);
    const isMobileOrTablet = mobileAndTabletCheck();
    setIsMobile(isMobileOrTablet);

    // Add some plugins
    const manager = await viewer.addPlugin(AssetManagerPlugin);

    const camera = viewer.scene.activeCamera;
    const position = camera.position;
    const target = camera.target;

    setCameraRef(camera);
    setPositionRef(position);
    setTargetRef(target);

    // Add plugins individually.
    await viewer.addPlugin(GBufferPlugin);
    await viewer.addPlugin(new ProgressivePlugin(32));
    await viewer.addPlugin(new TonemapPlugin(true));
    await viewer.addPlugin(GammaCorrectionPlugin);
    await viewer.addPlugin(SSRPlugin);
    await viewer.addPlugin(SSAOPlugin);
    await viewer.addPlugin(BloomPlugin);

    viewer.renderer.refreshPipeline();

    // Import and add a GLB file.
    await manager.addFromPath("scene-black.glb");

    viewer.getPlugin(TonemapPlugin).config.clipBackground = true;

    viewer.scene.activeCamera.setCameraOptions({ controlsEnabled: false });

    if (isMobileOrTablet) {
      position.set(-16.7, 1.17, 11.7);
      target.set(0, 1.37, 0);
      props.contentRef.current.className = "mobile-or-tablet";
    }

    window.scrollTo(0, 0);

    let needsUpdate = true;

    const onUpdate = () => {
      needsUpdate = true;
      viewer.setDirty(d);
    };

    viewer.addEventListener("preFrame", () => {
      if (needsUpdate) {
        camera.positionTargetUpdated(true);
        needsUpdate = false;
      }
    });
    memorizedScrollAnimation({ position, target, isMobileOrTablet, onUpdate });
  }, []);

  useEffect(() => {
    setupViewer();
  }, []);

  const handleExit = useCallback(() => {
    canvasContainerRef.current.style.pointerEvents = "none";
    props.contentRef.current.style.opacity = "1";

    viewerRef.scene.activeCamera.setCameraOptions({
      controlsEnabled: false,
    });

    setPreviewMode(false);

    gsap.to(positionRef, {
      x: !isMobileOrTablet ? 1.56 : 9.36,
      y: !isMobileOrTablet ? 5.0 : 10.95,
      z: !isMobileOrTablet ? 0.01 : 0.09,
      scrollTrigger: {
        trigger: ".display-section",
        start: "top bottom",
        end: "top top",
        scrub: 2,
        immediateRender: false,
      },
      onUpdate: () => {
        viewerRef.setDirty();
        cameraRef.positionTargetUpdated(true);
      },
    });
    gsap.to(targetRef, {
      x: !isMobileOrTablet ? -0.55 : -1.62,
      y: !isMobileOrTablet ? 0.32 : 0.02,
      z: !isMobileOrTablet ? 0.0 : -0.06,
      scrollTrigger: {
        trigger: ".display-section",
        start: "top bottom",
        end: "top top",
        scrub: 2,
        immediateRender: false,
      },
    });
  }, [canvasContainerRef, viewerRef, positionRef, targetRef, cameraRef]);

  return (
    <div ref={canvasContainerRef} id="webgi-canvas-container">
      <canvas id="webgi-canvas" ref={canvasRef} />
      {previewMode && (
        <button className="button" onClick={handleExit}>
          Exit
        </button>
      )}
    </div>
  );
});

export default WebgiViewer;