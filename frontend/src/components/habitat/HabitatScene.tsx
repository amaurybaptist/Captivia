'use client';
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  Edges,
  Html,
  OrbitControls,
  TransformControls,
  useGLTF,
  useProgress,
  useTexture,
} from '@react-three/drei';
import { Box3, Group, Mesh, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three';
import {
  isAquatic,
  type Dimensions,
  type HabitatItem,
  type HabitatProfile,
} from '@/lib/habitat/planner';
import { downloadFile, floorHeight } from '@/lib/habitat/workspace';

const ASSETS: Partial<Record<HabitatItem['kind'], string>> = {
  rock: 'rock',
  plant: 'foliage',
  branch: 'branch',
  hide: 'hide',
};
function ExistingModel({
  item,
  aquatic,
  realistic,
}: {
  item: HabitatItem;
  aquatic: boolean;
  realistic: boolean;
}) {
  const base = item.kind === 'plant' && aquatic ? 'aquatic-plant' : ASSETS[item.kind];
  const name =
    realistic && ['rock', 'foliage', 'branch'].includes(base || '') ? `${base}-real` : base;
  const { scene } = useGLTF(`/models/habitat/${name}.glb`);
  const model = useMemo(() => {
    const clone = scene.clone(true),
      box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3()),
      center = box.getCenter(new Vector3());
    clone.position.set(-center.x, -center.y, -center.z);
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return {
      clone,
      scale: [
        item.size[0] / (size.x || 1),
        item.size[1] / (size.y || 1),
        item.size[2] / (size.z || 1),
      ] as [number, number, number],
    };
  }, [scene, item.size]);
  return (
    <group scale={model.scale}>
      <primitive object={model.clone} />
    </group>
  );
}
function TexturedSubstrate({
  profile,
  width,
  depth,
  floor,
}: {
  profile: HabitatProfile;
  width: number;
  depth: number;
  floor: number;
}) {
  const name =
    profile.layout === 'arboreal' || profile.id === 'python' || profile.id === 'corn'
      ? 'forest'
      : profile.layout === 'freshwater'
        ? 'gravel'
        : 'sand';
  const original = useTexture(`/textures/habitat/${name}.webp`);
  const map = useMemo(() => {
    const texture = original.clone();
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(Math.max(1, width / 0.6), Math.max(1, depth / 0.6));
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [original, width, depth]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={[0, floor / 2, 0]} receiveShadow>
      <boxGeometry args={[width, floor, depth]} />
      <meshStandardMaterial map={map} roughness={1} />
    </mesh>
  );
}
function Equipment({ item }: { item: HabitatItem }) {
  if (item.kind === 'water')
    return (
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[item.size[0] / 2, item.size[0] / 2.2, item.size[1], 32]} />
          <meshStandardMaterial color="#a5987e" roughness={0.8} />
        </mesh>
        <mesh position={[0, item.size[1] / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[item.size[0] * 0.39, 32]} />
          <meshStandardMaterial color="#79adb1" roughness={0.15} metalness={0.1} />
        </mesh>
      </group>
    );
  if (item.kind === 'lamp')
    return (
      <mesh castShadow>
        <cylinderGeometry args={[item.size[0] * 0.3, item.size[0] / 2, item.size[1], 32]} />
        <meshStandardMaterial color="#343f3c" roughness={0.45} metalness={0.35} />
      </mesh>
    );
  if (item.kind === 'heater' || item.kind === 'probe' || item.kind === 'skimmer')
    return (
      <mesh castShadow>
        <cylinderGeometry args={[item.size[0] / 2, item.size[0] / 2, item.size[1], 20]} />
        <meshStandardMaterial color={item.color} roughness={0.4} metalness={0.2} />
      </mesh>
    );
  return (
    <mesh castShadow>
      <boxGeometry args={item.size} />
      <meshStandardMaterial color={item.color} roughness={0.65} metalness={0.1} />
    </mesh>
  );
}
function EditableItem({
  item,
  aquatic,
  selected,
  interactive,
  mode,
  realistic,
  onSelect,
  onTransform,
  onDrag,
}: {
  item: HabitatItem;
  aquatic: boolean;
  selected: boolean;
  interactive: boolean;
  mode: 'translate' | 'rotate';
  realistic: boolean;
  onSelect: (id: string) => void;
  onTransform: (id: string, position: [number, number, number], rotation: number) => void;
  onDrag: (value: boolean) => void;
}) {
  // Drei accepts a non-null ref type; the group is attached before its layout effect.
  const object = useRef<Group>(null!);
  return (
    <>
      <group
        ref={object}
        name={item.id}
        position={item.position}
        rotation={[0, item.rotation, 0]}
        onClick={
          interactive
            ? (event) => {
                event.stopPropagation();
                onSelect(item.id);
              }
            : undefined
        }
      >
        {ASSETS[item.kind] ? (
          <ExistingModel item={item} aquatic={aquatic} realistic={realistic} />
        ) : (
          <Equipment item={item} />
        )}
        {selected && (
          <group name="editor-overlay">
            <mesh>
              <boxGeometry args={item.size.map((v) => v + 0.008) as [number, number, number]} />
              <meshBasicMaterial
                color={item.locked ? '#d7ad67' : '#10b981'}
                wireframe
                transparent
                opacity={0.85}
              />
            </mesh>
            <Html
              position={[0, item.size[1] / 2 + 0.025, 0]}
              center
              style={{ pointerEvents: 'none' }}
            >
              <span className="habitat-object-label">
                {item.label}
                {item.locked ? ' · verrouillé' : ''}
              </span>
            </Html>
          </group>
        )}
      </group>
      {selected && interactive && !item.locked && (
        <TransformControls
          name="editor-overlay"
          object={object}
          mode={mode}
          showX={mode === 'translate'}
          showZ={mode === 'translate'}
          showY
          translationSnap={0.01}
          rotationSnap={Math.PI / 12}
          size={0.7}
          onMouseDown={() => onDrag(true)}
          onMouseUp={() => {
            onDrag(false);
            if (object.current) {
              const { position, rotation } = object.current;
              onTransform(item.id, [position.x, position.y, position.z], rotation.y);
            }
          }}
        />
      )}
    </>
  );
}
type SceneActions = { png: () => void; glb: () => Promise<void> };
function Capture({
  actions,
  onReady,
}: {
  actions: RefObject<SceneActions | null>;
  onReady: (ready: boolean) => void;
}) {
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    actions.current = {
      png: () => {
        const overlays: { object: import('three').Object3D; visible: boolean }[] = [];
        scene.traverse((object) => {
          if (object.name === 'editor-overlay') {
            overlays.push({ object, visible: object.visible });
            object.visible = false;
          }
        });
        try {
          gl.render(scene, camera);
          gl.domElement.toBlob((blob) => {
            if (blob) downloadFile(blob, 'captivia-habitat-3d.png');
          });
        } finally {
          for (const overlay of overlays) overlay.object.visible = overlay.visible;
          invalidate();
        }
      },
      glb: async () => {
        const root = scene.getObjectByName('habitat-model');
        if (!root) throw new Error('Scène indisponible.');
        const clone = root.clone(true);
        clone.userData = {
          ...clone.userData,
          credits:
            'Poly Haven, ambientCG and Kenney — CC0 1.0 — see bundled asset provenance and licenses',
          description: 'Schematic habitat layout; not a thermal or water-flow simulation.',
        };
        clone.traverse((object) => {
          if (object.name === 'editor-overlay') object.visible = false;
        });
        const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
        const output = await new GLTFExporter().parseAsync(clone, {
          binary: true,
          onlyVisible: true,
        });
        if (!(output instanceof ArrayBuffer)) throw new Error('Export 3D indisponible.');
        downloadFile(new Blob([output], { type: 'model/gltf-binary' }), 'captivia-habitat.glb');
      },
    };
    onReady(true);
    return () => {
      actions.current = null;
      onReady(false);
    };
  }, [gl, scene, camera, invalidate, actions, onReady]);
  return null;
}
export default function HabitatScene({
  dimensions: d,
  profile,
  items,
  selected,
  onSelect,
  onTransform,
  onFailure,
  editingDisabled,
}: {
  dimensions: Dimensions;
  profile: HabitatProfile;
  items: HabitatItem[];
  selected?: string;
  onSelect: (id: string) => void;
  onTransform: (id: string, position: [number, number, number], rotation: number) => void;
  onFailure: () => void;
  editingDisabled: boolean;
}) {
  const [interactive, setInteractive] = useState(false),
    [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<'translate' | 'rotate'>('translate'),
    [quality, setQuality] = useState<'light' | 'standard' | 'high'>('standard');
  const [grid, setGrid] = useState(false),
    [exporting, setExporting] = useState(false),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false);
  const actions = useRef<SceneActions | null>(null),
    controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { active: assetsLoading } = useProgress();
  const w = d.width / 100,
    h = d.height / 100,
    z = d.depth / 100,
    radius = Math.max(w, h, z),
    floor = floorHeight(profile);
  async function export3d() {
    setExporting(true);
    setError('');
    try {
      await actions.current?.glb();
    } catch {
      setError('L’export 3D a échoué. Le plan 2D reste disponible.');
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="habitat-scene-shell">
      <div className="habitat-scene-toolbar">
        <label>
          Qualité
          <select
            aria-label="Qualité"
            value={quality}
            onChange={(event) => setQuality(event.target.value as 'light' | 'standard' | 'high')}
          >
            <option value="light">Légère</option>
            <option value="standard">Réaliste équilibrée</option>
            <option value="high">Détaillée</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={grid}
            onChange={(event) => setGrid(event.target.checked)}
          />
          Grille
        </label>
        <button type="button" className="habitat-button" onClick={() => controls.current?.reset()}>
          Recentrer
        </button>
      </div>
      <div className="habitat-scene" style={{ touchAction: interactive ? 'none' : 'pan-y' }}>
        <Canvas
          key={`${w}-${h}-${z}`}
          frameloop="demand"
          shadows={quality === 'high'}
          dpr={[1, quality === 'high' ? 2 : 1.5]}
          camera={{
            position: [radius * 1.35, h / 2 + radius * 0.7, radius * 1.6],
            fov: 40,
            near: 0.01,
            far: 50,
          }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
          style={{
            pointerEvents: interactive ? 'auto' : 'none',
            touchAction: interactive ? 'none' : 'pan-y',
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              'webglcontextlost',
              (event) => {
                event.preventDefault();
                // R3F also loses the context deliberately after removing an old canvas.
                if (gl.domElement.isConnected) onFailure();
              },
              { once: true },
            );
          }}
          fallback={
            <button type="button" onClick={onFailure}>
              3D indisponible : afficher le plan 2D
            </button>
          }
        >
          <ambientLight intensity={1.2} />
          <hemisphereLight args={['#f6f4dc', '#697467', 1.2]} />
          <directionalLight
            castShadow={quality === 'high'}
            position={[3, 5, 4]}
            intensity={2.5}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-left={-4}
            shadow-camera-right={4}
            shadow-camera-top={5}
            shadow-camera-bottom={-2}
            shadow-bias={-0.0002}
          />
          <directionalLight position={[-3, 2, -2]} intensity={0.7} color="#b4d6c5" />
          <group name="habitat-model">
            <mesh position={[0, -0.025, 0]} receiveShadow>
              <boxGeometry args={[w + 0.08, 0.05, z + 0.08]} />
              <meshStandardMaterial color="#304a42" roughness={0.7} />
            </mesh>
            {quality === 'light' ? (
              <mesh position={[0, floor / 2, 0]} receiveShadow>
                <boxGeometry args={[w, floor, z]} />
                <meshStandardMaterial color={profile.substrateColor} roughness={1} />
              </mesh>
            ) : (
              <Suspense fallback={null}>
                <TexturedSubstrate profile={profile} width={w} depth={z} floor={floor} />
              </Suspense>
            )}
            <mesh position={[0, h / 2, 0]}>
              <boxGeometry args={[w, h, z]} />
              <meshBasicMaterial color="#accfc7" transparent opacity={0.045} depthWrite={false} />
              <Edges color="#6b9487" threshold={15} />
            </mesh>
            {isAquatic(profile) && (
              <mesh position={[0, h * 0.46, 0]}>
                <boxGeometry args={[w - 0.006, h * 0.84, z - 0.006]} />
                <meshBasicMaterial
                  color={profile.layout === 'marine' ? '#55b6d5' : '#4babc2'}
                  transparent
                  opacity={0.08}
                  depthWrite={false}
                />
              </mesh>
            )}
            <Suspense fallback={null}>
              {items.map((item) => (
                <EditableItem
                  key={item.id}
                  item={item}
                  aquatic={isAquatic(profile)}
                  selected={selected === item.id}
                  interactive={interactive && !editingDisabled}
                  mode={mode}
                  realistic={quality !== 'light'}
                  onSelect={onSelect}
                  onTransform={onTransform}
                  onDrag={setDragging}
                />
              ))}
            </Suspense>
          </group>
          {grid && (
            <gridHelper args={[radius * 2.5, 25, '#6b9487', '#c3d2c8']} position={[0, -0.055, 0]} />
          )}
          <OrbitControls
            ref={controls}
            makeDefault
            enabled={interactive && !dragging}
            target={[0, h / 2, 0]}
            enableDamping={false}
            enablePan={false}
            minDistance={radius * 0.8}
            maxDistance={radius * 4}
            minPolarAngle={0.15}
            maxPolarAngle={Math.PI / 2.05}
          />
          <Capture actions={actions} onReady={setReady} />
        </Canvas>
        {assetsLoading && (
          <p className="habitat-loading-overlay" role="status">
            Chargement des décors…
          </p>
        )}
      </div>
      <div className="habitat-scene-controls">
        <button
          type="button"
          className={interactive ? 'habitat-button primary' : 'habitat-button'}
          onClick={() => {
            setInteractive(!interactive);
            setDragging(false);
          }}
          aria-pressed={interactive}
        >
          {interactive ? 'Terminer l’exploration' : 'Explorer et modifier en 3D'}
        </button>
        {interactive && (
          <div className="habitat-view-tabs" role="group" aria-label="Outil d’édition">
            <button
              type="button"
              aria-pressed={mode === 'translate'}
              onClick={() => setMode('translate')}
            >
              Déplacer
            </button>
            <button
              type="button"
              aria-pressed={mode === 'rotate'}
              onClick={() => setMode('rotate')}
            >
              Tourner
            </button>
          </div>
        )}
        <button
          type="button"
          className="habitat-button"
          disabled={!ready || assetsLoading || exporting}
          onClick={() => actions.current?.png()}
        >
          Image PNG
        </button>
        <button
          type="button"
          className="habitat-button"
          disabled={!ready || assetsLoading || exporting}
          onClick={() => void export3d()}
        >
          {exporting ? 'Export…' : 'Modèle 3D GLB'}
        </button>
      </div>
      <p className="habitat-view-hint">
        {interactive
          ? 'Glissez pour tourner · pincez pour zoomer · sélectionnez un objet, puis utilisez ses poignées. Les éléments verrouillés restent fixes.'
          : 'Activez l’exploration pour manipuler la scène. Sinon, le défilement de la page reste libre.'}
      </p>
      {error && (
        <p role="alert" className="habitat-callout warning">
          {error}
        </p>
      )}
    </div>
  );
}
