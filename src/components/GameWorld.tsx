import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  labels,
  type World as WorldState,
  type WorldObject,
} from "../../shared/engine";
import type { Mood } from "./Pet";

const shades = {
  purple: "#b798eb",
  pink: "#f29bc3",
  blue: "#73bfdc",
  green: "#8dca87",
  orange: "#ffb765",
};
type V3 = [number, number, number];
function Ball({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  color = "#fff",
  radius = 0.5,
  ...props
}: {
  position?: V3;
  scale?: V3;
  color?: string;
  radius?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  castShadow?: boolean;
}) {
  return (
    <mesh position={position} scale={scale} castShadow receiveShadow {...props}>
      <sphereGeometry args={[radius, 28, 20]} />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  );
}
function Box({
  position = [0, 0, 0],
  size = [1, 1, 1],
  color = "#fff",
  rotation = [0, 0, 0],
  ...props
}: {
  position?: V3;
  size?: V3;
  color?: string;
  rotation?: V3;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      {...props}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Cone({
  position = [0, 0, 0],
  radius = 0.5,
  height = 1,
  color = "#fff",
  rotation = [0, 0, 0],
}: {
  position?: V3;
  radius?: number;
  height?: number;
  color?: string;
  rotation?: V3;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <coneGeometry args={[radius, height, 5]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
function Tube({
  points,
  color,
  radius = 0.03,
}: {
  points: V3[];
  color: string;
  radius?: number;
}) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    [points],
  );
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 20, radius, 7, false]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
function Label({
  text,
  position = [0, 0, 0],
  width = 2.2,
}: {
  text: string;
  position?: V3;
  width?: number;
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff9e9";
    ctx.beginPath();
    ctx.roundRect(4, 4, 504, 120, 35);
    ctx.fill();
    ctx.font = 'bold 35px "Noto Bengali", sans-serif';
    ctx.fillStyle = "#59745c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      text.length > 26 ? text.slice(0, 25) + "…" : text,
      256,
      66,
      470,
    );
    return new THREE.CanvasTexture(c);
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[width, width / 4, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}
function Tree({
  position,
  scale = 1,
  color = "#78b78b",
}: {
  position: V3;
  scale?: number;
  color?: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.22, 1.5, 7]} />
        <meshStandardMaterial color="#ab845d" />
      </mesh>
      <Ball
        position={[0, 1.85, 0]}
        scale={[1, 1.22, 1]}
        radius={0.88}
        color={color}
      />
      <Ball position={[-0.44, 1.54, 0.12]} radius={0.65} color={color} />
      <Ball position={[0.46, 1.7, 0]} radius={0.7} color={color} />
      <Ball position={[-0.22, 2.22, 0.1]} radius={0.7} color={color} />
      <Ball position={[0.3, 2.35, 0.25]} radius={0.08} color="#f7d171" />
      <Ball position={[-0.45, 1.95, 0.65]} radius={0.09} color="#f7d171" />
    </group>
  );
}
function Flower({
  position,
  color = "#f7a8c1",
  scale = 1,
}: {
  position: V3;
  color?: string;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.5, 6]} />
        <meshStandardMaterial color="#74a769" />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <Ball
          key={i}
          position={[
            Math.sin(i * Math.PI * 0.4) * 0.13,
            0.52 + Math.cos(i * Math.PI * 0.4) * 0.13,
            0,
          ]}
          radius={0.1}
          color={color}
        />
      ))}
      <Ball position={[0, 0.52, 0.065]} radius={0.075} color="#ffdf79" />
    </group>
  );
}
function Cloud({ position, scale = 1 }: { position: V3; scale?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.position.y =
        position[1] + Math.sin(clock.elapsedTime * 0.3 + position[0]) * 0.15;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <Ball
        position={[0, 0, 0]}
        radius={1}
        scale={[1.9, 0.62, 0.8]}
        color="#fffbed"
      />
      <Ball position={[-0.55, 0.35, 0]} radius={0.75} color="#fffbed" />
      <Ball position={[0.5, 0.5, 0]} radius={0.9} color="#fffbed" />
    </group>
  );
}
function Mithu({
  mood,
  target,
  pat,
  onPet,
}: {
  mood: Mood;
  target: [number, number];
  pat: number;
  onPet: () => void;
}) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const feet = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const pulse = useRef(0);
  const previousPat = useRef(pat);
  useFrame(({ clock }, dt) => {
    if (!root.current) return;
    const t = clock.elapsedTime;
    const x = root.current.position.x,
      z = root.current.position.z;
    const dx = target[0] - x,
      dz = target[1] - z;
    const walking = Math.hypot(dx, dz) > 0.12;
    root.current.position.x = THREE.MathUtils.damp(x, target[0], 3, dt);
    root.current.position.z = THREE.MathUtils.damp(z, target[1], 3, dt);
    const wanted = walking ? Math.atan2(dx, dz) : 0.48;
    root.current.rotation.y = THREE.MathUtils.damp(
      root.current.rotation.y,
      wanted,
      4,
      dt,
    );
    if (previousPat.current !== pat) {
      pulse.current = t;
      previousPat.current = pat;
    }
    const happy = t - pulse.current < 1.8 && pat > 0;
    root.current.position.y =
      (walking ? Math.abs(Math.sin(t * 10)) * 0.12 : Math.sin(t * 2) * 0.025) +
      (happy ? Math.abs(Math.sin((t - pulse.current) * 8)) * 0.38 : 0);
    if (head.current) {
      head.current.rotation.z =
        mood === "listening" ? 0.15 : Math.sin(t * 1.2) * 0.025;
      head.current.rotation.x = mood === "thinking" ? 0.12 : Math.sin(t) * 0.02;
    }
    if (arm.current)
      arm.current.rotation.z = happy
        ? Math.sin(t * 13) * 0.6 + 0.6
        : Math.sin(t * 2) * 0.05;
    if (eyes.current) {
      // Smooth blink: an eased dip every 5 seconds instead of a hard cut.
      const phase = (t % 5) - 0.12;
      const blink =
        phase > 0 && phase < 0.16 ? Math.sin((phase / 0.16) * Math.PI) : 0;
      const target = happy ? 0.2 : 1 - 0.9 * blink;
      eyes.current.scale.y = THREE.MathUtils.damp(
        eyes.current.scale.y,
        target,
        happy ? 12 : 30,
        dt,
      );
    }
    if (tail.current) tail.current.rotation.y = Math.sin(t * 2.6) * 0.22;
    if (feet.current)
      feet.current.rotation.x = walking ? Math.sin(t * 10) * 0.18 : 0;
    if (mouth.current)
      mouth.current.scale.y =
        mood === "speaking"
          ? 0.4 + Math.abs(Math.sin(t * 12))
          : mood === "happy" || happy
            ? 0.85
            : 0.08;
  });
  return (
    <group
      ref={root}
      position={[0, 0, 1.8]}
      onClick={(e) => {
        e.stopPropagation();
        onPet();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <Ball
        position={[0, 1, 0]}
        scale={[0.93, 1.13, 0.72]}
        radius={0.8}
        color="#f9b879"
      />
      <Ball
        position={[0, 1.04, 0.48]}
        scale={[0.68, 0.88, 0.32]}
        radius={0.62}
        color="#fff0cf"
      />
      <group ref={feet}>
        <Ball
          position={[-0.46, 0.22, 0.25]}
          scale={[1, 0.58, 1.2]}
          radius={0.38}
          color="#f4aa6f"
        />
        <Ball
          position={[0.46, 0.22, 0.25]}
          scale={[1, 0.58, 1.2]}
          radius={0.38}
          color="#f4aa6f"
        />
      </group>
      <Ball
        position={[-0.82, 1.05, 0.07]}
        scale={[0.48, 0.94, 0.64]}
        radius={0.43}
        color="#ffc28b"
      />
      <group ref={arm} position={[0.74, 1.32, 0]}>
        <Ball
          position={[0.08, -0.27, 0.08]}
          scale={[0.5, 1, 0.7]}
          radius={0.43}
          color="#ffc28b"
        />
      </group>
      <group ref={tail} position={[0.52, 0.67, -0.38]}>
        <Tube
          points={[
            [0, 0, 0],
            [0.58, 0.08, -0.13],
            [0.94, 0.45, -0.12],
            [0.88, 0.8, 0.12],
          ]}
          radius={0.22}
          color="#f7b077"
        />
        <Ball position={[0.88, 0.8, 0.12]} radius={0.23} color="#ffe1a8" />
      </group>
      <group ref={head} position={[0, 2.04, 0]}>
        <Ball scale={[1.16, 0.91, 0.84]} radius={1} color="#ffca8c" />
        <Cone
          position={[-0.72, 0.77, -0.03]}
          radius={0.42}
          height={0.94}
          rotation={[0, 0, 0.25]}
          color="#ffc58a"
        />
        <Cone
          position={[0.72, 0.77, -0.03]}
          radius={0.42}
          height={0.94}
          rotation={[0, 0, -0.25]}
          color="#ffc58a"
        />
        <Cone
          position={[-0.73, 0.78, 0.15]}
          radius={0.25}
          height={0.58}
          rotation={[0, 0, 0.25]}
          color="#eba5a1"
        />
        <Cone
          position={[0.73, 0.78, 0.15]}
          radius={0.25}
          height={0.58}
          rotation={[0, 0, -0.25]}
          color="#eba5a1"
        />
        <Ball
          position={[-0.35, -0.27, 0.66]}
          scale={[1.2, 0.85, 0.48]}
          radius={0.37}
          color="#fff2d7"
        />
        <Ball
          position={[0.35, -0.27, 0.66]}
          scale={[1.2, 0.85, 0.48]}
          radius={0.37}
          color="#fff2d7"
        />
        <group ref={eyes} position={[0, 0.1, 0]}>
          {[-0.43, 0.43].map((x) => (
            <group key={x}>
              <Ball
                position={[x, 0.025, 0.85]}
                scale={[0.82, 1, 0.5]}
                radius={0.145}
                color="#463d39"
              />
              <Ball
                position={[x - 0.025, 0.072, 0.93]}
                radius={0.035}
                color="#fff"
              />
            </group>
          ))}
        </group>
        <Ball
          position={[-0.77, -0.19, 0.64]}
          scale={[1.3, 0.6, 0.23]}
          radius={0.2}
          color="#ec9992"
        />
        <Ball
          position={[0.77, -0.19, 0.64]}
          scale={[1.3, 0.6, 0.23]}
          radius={0.2}
          color="#ec9992"
        />
        <Ball
          position={[0, -0.18, 0.895]}
          scale={[1, 0.68, 0.55]}
          radius={0.12}
          color="#b87766"
        />
        <Tube
          points={[
            [-0.14, -0.32, 0.95],
            [0, -0.42, 0.98],
            [0.14, -0.32, 0.95],
          ]}
          color="#976960"
          radius={0.017}
        />
        <mesh ref={mouth} position={[0, -0.4, 0.88]}>
          <sphereGeometry args={[0.12, 20, 12]} />
          <meshStandardMaterial color="#a26964" />
        </mesh>
        <Tube
          points={[
            [-0.62, -0.31, 0.78],
            [-0.96, -0.33, 0.72],
            [-1.12, -0.25, 0.68],
          ]}
          color="#c0926b"
          radius={0.014}
        />
        <Tube
          points={[
            [0.62, -0.31, 0.78],
            [0.96, -0.33, 0.72],
            [1.12, -0.25, 0.68],
          ]}
          color="#c0926b"
          radius={0.014}
        />
        <Box
          position={[0, 0.64, 0.56]}
          size={[0.16, 0.35, 0.07]}
          color="#efad72"
          rotation={[0, 0, -0.2]}
        />
      </group>
      <mesh position={[0, 1.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.65, 0.15, 10, 30]} />
        <meshStandardMaterial color="#9b7dd0" />
      </mesh>
      <Box
        position={[0.45, 1.06, 0.54]}
        size={[0.28, 0.65, 0.12]}
        color="#ad8edb"
        rotation={[0, 0, 0.3]}
      />
      <Ball position={[0, 1.35, 0.75]} radius={0.14} color="#f9db77" />
      {(mood === "listening" || mood === "thinking") && (
        <Label
          text={mood === "listening" ? "শুনছি…" : "একটু ভাবছি…"}
          position={[0, 3.75, 0]}
          width={1.8}
        />
      )}
    </group>
  );
}
function Castle({ color }: { color: string }) {
  return (
    <group position={[0, 0, -2.7]}>
      <Box position={[0, 1.3, 0]} size={[3.7, 2.6, 1.8]} color={color} />
      <Box position={[0, 2.8, -0.1]} size={[1.6, 1.4, 1.4]} color="#d9c8f0" />
      <Cone
        position={[0, 3.9, -0.1]}
        radius={1.36}
        height={1.2}
        color="#a384ca"
      />
      {[-2, 2].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.9, 0]} castShadow>
            <cylinderGeometry args={[0.68, 0.76, 3.8, 12]} />
            <meshStandardMaterial color="#dbc5ec" />
          </mesh>
          <Cone
            position={[x, 4.3, 0]}
            radius={0.95}
            height={1.5}
            color={color}
          />
          <Box
            position={[x, 2.4, 0.675]}
            size={[0.26, 0.7, 0.06]}
            color="#9183b8"
          />
          <Box
            position={[x, 5.24, 0]}
            size={[0.05, 0.8, 0.05]}
            color="#d0b46b"
          />
          <Box
            position={[x + 0.25, 5.5, 0]}
            size={[0.5, 0.28, 0.05]}
            color="#f4d785"
          />
        </group>
      ))}
      <Box
        position={[0, 0.79, 0.94]}
        size={[0.9, 1.57, 0.08]}
        color="#9881b3"
      />
      <Ball
        position={[0, 1.57, 0.94]}
        scale={[1, 0.8, 0.1]}
        radius={0.45}
        color="#9881b3"
      />
      <Label text="তোমার কল্পনার রাজ্য" position={[0, 2.8, 1]} width={2.8} />
    </group>
  );
}
function Restaurant({ shop = false }: { shop?: boolean }) {
  return (
    <group position={[-0.3, 0, -2.5]}>
      <Box position={[0, 0.6, 0]} size={[4, 1.2, 1.5]} color="#efc986" />
      <Box position={[0, 1.3, 0]} size={[4.5, 0.22, 1.8]} color="#b78362" />
      {[-1.8, 1.8].map((x) => (
        <Box
          key={x}
          position={[x, 2, 0]}
          size={[0.11, 2.8, 0.11]}
          color="#b68a65"
        />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i}>
          <Box
            position={[-1.84 + i * 0.53, 3.25, 0]}
            size={[0.53, 0.15, 2.25]}
            color={i % 2 ? "#ffedb2" : "#e9a7a2"}
            rotation={[-0.1, 0, 0]}
          />
          <Ball
            position={[-1.84 + i * 0.53, 3.03, 1.14]}
            scale={[1, 0.65, 0.25]}
            radius={0.265}
            color={i % 2 ? "#ffedb2" : "#e9a7a2"}
          />
        </group>
      ))}
      <Label
        text={shop ? "বন্ধুর দোকান" : "মিঠুর রেস্তোরাঁ"}
        position={[0, 3.85, 0]}
        width={3.3}
      />
      <Box position={[1.12, 1.95, 0.35]} size={[0.7, 1, 0.1]} color="#6a9279" />
      <Label text="আজকের মেনু" position={[1.13, 2, 0.43]} width={0.65} />
      <Item kind="rice" position={[-1.2, 1.43, 0.05]} scale={0.65} />
      <Item kind="mango" position={[-0.5, 1.43, 0.1]} scale={0.65} />
      <mesh position={[-3.3, 0.65, 1]} castShadow>
        <cylinderGeometry args={[0.75, 0.75, 0.12, 20]} />
        <meshStandardMaterial color="#e9d0a4" />
      </mesh>
      <Box position={[-3.3, 0.3, 1]} size={[0.2, 0.6, 0.2]} color="#ad855f" />
    </group>
  );
}
function Bridge() {
  return (
    <group position={[2.3, 0.09, 0.3]} rotation={[0, Math.PI / 2, 0]}>
      {Array.from({ length: 9 }, (_, i) => (
        <Box
          key={i}
          position={[-1.2 + i * 0.3, Math.sin((i / 8) * Math.PI) * 0.2, 0]}
          size={[0.28, 0.15, 1.55]}
          color={i % 2 ? "#cba075" : "#d7ad80"}
        />
      ))}
      {[-0.7, 0.7].map((z) => (
        <group key={z}>
          {[-1.1, 0, 1.1].map((x) => (
            <Box
              key={x}
              position={[x, 0.47, z]}
              size={[0.1, 0.85, 0.1]}
              color="#b48a5c"
            />
          ))}
          <Tube
            points={[
              [-1.15, 0.8, z],
              [0, 1, z],
              [1.15, 0.8, z],
            ]}
            color="#b48a5c"
            radius={0.04}
          />
        </group>
      ))}
    </group>
  );
}
function Dragon({
  position,
  onClick,
  fed,
}: {
  position: V3;
  onClick: () => void;
  fed: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.position.y =
        position[1] + Math.sin(clock.elapsedTime * 2) * 0.06;
  });
  return (
    <group
      ref={ref}
      position={position}
      rotation={[0, -0.2, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Ball
        position={[0, 0.65, 0]}
        radius={0.67}
        scale={[0.8, 1, 0.7]}
        color="#89baa4"
      />
      <Ball
        position={[0, 0.67, 0.34]}
        radius={0.44}
        scale={[0.85, 1, 0.5]}
        color="#d4e6af"
      />
      <Ball
        position={[0, 1.44, 0]}
        radius={0.63}
        scale={[1, 0.85, 0.75]}
        color="#a3cfb3"
      />
      <Ball
        position={[0, 1.25, 0.44]}
        radius={0.38}
        scale={[1.2, 0.6, 0.6]}
        color="#c9deb4"
      />
      {[-0.26, 0.26].map((x) => (
        <group key={x}>
          <Ball position={[x, 1.53, 0.43]} radius={0.065} color="#496654" />
          <Cone
            position={[x, 2, 0.01]}
            radius={0.12}
            height={0.45}
            color="#eedf9c"
          />
          <Ball
            position={[x, 0.15, 0.2]}
            radius={0.24}
            scale={[1, 0.6, 1.3]}
            color="#85b59e"
          />
        </group>
      ))}
      <Cone
        position={[-0.72, 0.92, -0.14]}
        radius={0.58}
        height={0.9}
        rotation={[0, 0, 0.8]}
        color="#bca5d9"
      />
      <Cone
        position={[0.72, 0.92, -0.14]}
        radius={0.58}
        height={0.9}
        rotation={[0, 0, -0.8]}
        color="#bca5d9"
      />
      <Tube
        points={[
          [0, 0.5, -0.35],
          [0.8, 0.35, -0.75],
          [1.2, 0.55, -0.8],
        ]}
        color="#8fbfa6"
        radius={0.18}
      />
      <Label
        text={fed ? "ইয়াম! ধন্যবাদ বন্ধু!" : "আমার নাম টুনটুন"}
        position={[0, 2.5, 0]}
        width={2.4}
      />
    </group>
  );
}
function Bunny({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Ball position={[0, 0.35, 0]} radius={0.4} color="#fff4dc" />
      <Ball position={[0, 0.86, 0]} radius={0.38} color="#fff4dc" />
      {[-0.17, 0.17].map((x) => (
        <group key={x}>
          <Ball
            position={[x, 1.37, 0]}
            radius={0.2}
            scale={[0.6, 2, 0.6]}
            color="#fff0d6"
          />
          <Ball
            position={[x, 1.4, 0.09]}
            radius={0.13}
            scale={[0.5, 2, 0.4]}
            color="#eeb1ae"
          />
          <Ball position={[x, 0.91, 0.33]} radius={0.045} color="#655348" />
        </group>
      ))}
      <Ball position={[0, 0.77, 0.37]} radius={0.06} color="#d9959c" />
    </group>
  );
}
function Bird({ position }: { position: V3 }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y =
        position[1] + Math.sin(clock.elapsedTime * 2) * 0.2;
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 5) * 0.1;
    }
  });
  return (
    <group ref={ref} position={position}>
      <Ball radius={0.3} color="#f0d271" />
      <Ball position={[0.1, 0.26, 0.15]} radius={0.23} color="#ffe599" />
      <Cone
        position={[0.14, 0.24, 0.4]}
        radius={0.09}
        height={0.2}
        rotation={[Math.PI / 2, 0, 0]}
        color="#d79f55"
      />
      <Ball position={[0.23, 0.32, 0.27]} radius={0.035} color="#615344" />
      <Ball
        position={[-0.27, 0.05, 0]}
        radius={0.25}
        scale={[1.5, 0.25, 1]}
        color="#e6bb5f"
      />
      <Ball
        position={[0.27, 0.05, 0]}
        radius={0.25}
        scale={[1.5, 0.25, 1]}
        color="#e6bb5f"
      />
    </group>
  );
}
function Item({
  kind,
  position,
  scale = 1,
  onClick,
}: {
  kind: WorldObject;
  position: V3;
  scale?: number;
  onClick?: () => void;
}) {
  return (
    <group
      position={position}
      scale={scale}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {kind === "mango" ? (
        <>
          <Ball
            position={[0, 0.32, 0]}
            radius={0.33}
            scale={[0.85, 1.1, 0.8]}
            color="#ffcf60"
          />
          <Ball
            position={[0.16, 0.67, 0]}
            radius={0.14}
            scale={[1.4, 0.3, 0.8]}
            color="#72ab6f"
          />
        </>
      ) : kind === "rice" ? (
        <>
          <mesh position={[0, 0.22, 0]} castShadow>
            <sphereGeometry
              args={[0.4, 24, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
            />
            <meshStandardMaterial color="#b7a1d9" side={THREE.DoubleSide} />
          </mesh>
          <Ball
            position={[0, 0.22, 0]}
            radius={0.32}
            scale={[1, 0.7, 1]}
            color="#fff3d9"
          />
        </>
      ) : kind === "fish" ? (
        <>
          <Ball
            position={[0, 0.22, 0]}
            radius={0.3}
            scale={[1.4, 0.48, 0.65]}
            color="#81b9c3"
          />
          <Cone
            position={[-0.42, 0.22, 0]}
            radius={0.23}
            height={0.3}
            rotation={[0, 0, Math.PI / 2]}
            color="#7ab1bb"
          />
          <Ball position={[0.25, 0.3, 0.14]} radius={0.04} color="#416774" />
        </>
      ) : kind === "ball" ? (
        <>
          <Ball position={[0, 0.37, 0]} radius={0.37} color="#e8a8c7" />
          <mesh position={[0, 0.37, 0]} rotation={[0.4, 0.2, Math.PI / 2]}>
            <torusGeometry args={[0.365, 0.03, 8, 24]} />
            <meshStandardMaterial color="#ffdf97" />
          </mesh>
        </>
      ) : kind === "water" ? (
        <mesh position={[0, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.2, 0.6, 18]} />
          <meshStandardMaterial color="#9bd3e1" transparent opacity={0.8} />
        </mesh>
      ) : kind === "flower" ? (
        <Flower position={[0, 0, 0]} scale={1.3} />
      ) : kind === "tree" ? (
        <Tree position={[0, 0, 0]} scale={0.6} />
      ) : kind === "cake" ? (
        <>
          <mesh position={[0, 0.26, 0]} castShadow>
            <cylinderGeometry args={[0.37, 0.37, 0.45, 24]} />
            <meshStandardMaterial color="#e4a6b2" />
          </mesh>
          <mesh position={[0, 0.51, 0]}>
            <cylinderGeometry args={[0.38, 0.38, 0.08, 24]} />
            <meshStandardMaterial color="#fff0d3" />
          </mesh>
          <Box
            position={[0, 0.66, 0]}
            size={[0.05, 0.23, 0.05]}
            color="#ad8ecf"
          />
        </>
      ) : kind === "book" ? (
        <>
          <Box
            position={[0, 0.11, 0]}
            size={[0.55, 0.2, 0.7]}
            color="#a68cc6"
          />
          <Box
            position={[0, 0.12, 0.01]}
            size={[0.52, 0.11, 0.69]}
            color="#fff0cf"
          />
        </>
      ) : kind === "boat" ? (
        <>
          <Ball
            position={[0, 0.18, 0]}
            scale={[1.6, 0.45, 0.7]}
            radius={0.4}
            color="#bc9062"
          />
          <Box position={[0, 0.68, 0]} size={[0.03, 1, 0.03]} color="#9c7c55" />
          <Cone
            position={[0.2, 0.77, 0]}
            radius={0.36}
            height={0.65}
            color="#ead8f5"
          />
        </>
      ) : kind === "star" ? (
        <Cone
          position={[0, 0.42, 0]}
          radius={0.45}
          height={0.7}
          color="#f5d17b"
          rotation={[0, 0, 0.4]}
        />
      ) : (
        <Box size={[1.3, 0.16, 0.6]} position={[0, 0.1, 0]} color="#c49b71" />
      )}
    </group>
  );
}
function Imagination({
  item,
  index,
  onClick,
}: {
  item: { name: string; shape: string; color: string };
  index: number;
  onClick: () => void;
}) {
  const x = -3.1 + (index % 3) * 2.5,
    z = 2.7 + Math.floor(index / 3) * 1.25;
  const col = shades[item.color as keyof typeof shades] || "#c5a2e4";
  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {item.shape === "house" ? (
        <>
          <Box position={[0, 0.6, 0]} size={[1.1, 1.2, 0.9]} color={col} />
          <Cone
            position={[0, 1.6, 0]}
            radius={0.9}
            height={0.85}
            color="#f8d286"
          />
          <Box
            position={[0, 0.3, 0.46]}
            size={[0.3, 0.6, 0.05]}
            color="#987ea9"
          />
        </>
      ) : item.shape === "vehicle" ? (
        <>
          <Ball
            position={[0, 0.7, 0]}
            radius={0.65}
            scale={[1.4, 0.58, 0.7]}
            color={col}
          />
          <Ball
            position={[0.1, 0.99, 0]}
            radius={0.36}
            scale={[1, 0.85, 0.85]}
            color="#cce5de"
          />
          <Ball position={[-0.45, 0.22, 0.26]} radius={0.19} color="#7b8098" />
          <Ball position={[0.45, 0.22, 0.26]} radius={0.19} color="#7b8098" />
        </>
      ) : item.shape === "creature" ? (
        <>
          <Ball
            position={[0, 0.6, 0]}
            radius={0.55}
            scale={[0.9, 1.15, 0.8]}
            color={col}
          />
          <Ball position={[-0.17, 0.82, 0.41]} radius={0.11} color="#fff7df" />
          <Ball position={[0.17, 0.82, 0.41]} radius={0.11} color="#fff7df" />
          <Ball position={[-0.17, 0.82, 0.51]} radius={0.04} color="#56556b" />
          <Ball position={[0.17, 0.82, 0.51]} radius={0.04} color="#56556b" />
        </>
      ) : item.shape === "plant" ? (
        <Tree position={[0, 0, 0]} scale={0.65} color={col} />
      ) : (
        <>
          <Ball position={[0, 0.5, 0]} radius={0.5} color={col} />
          <Cone
            position={[0, 1.1, 0]}
            radius={0.35}
            height={0.7}
            color="#ffe096"
          />
          <Ball position={[0, 0.52, 0.45]} radius={0.11} color="#fff5cf" />
        </>
      )}
      <Label text={item.name} position={[0, 2.05, 0]} width={2} />
    </group>
  );
}
function Fireflies() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.045;
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 18 }, (_, i) => (
        <Ball
          key={i}
          position={[
            Math.sin(i * 2.4) * 7,
            0.7 + (i % 4) * 0.8,
            Math.cos(i * 2.4) * 7,
          ]}
          radius={0.035}
          color="#fff4ba"
        />
      ))}
    </group>
  );
}
function CameraRig({ zoom }: { zoom: number }) {
  const { camera } = useThree();
  useFrame((_state, dt) => {
    const distance = zoom === 1 ? 1 : zoom === 2 ? 0.8 : 1.15;
    camera.position.lerp(
      new THREE.Vector3(8.8 * distance, 8.3 * distance, 13.5 * distance),
      Math.min(1, dt * 3),
    );
    camera.lookAt(0, 0.8, 0);
  });
  return null;
}
function Scene({
  world,
  mood,
  pat,
  target,
  zoom,
  onPet,
  onMove,
  onItem,
  onCharacter,
  onImagine,
}: {
  world: WorldState;
  mood: Mood;
  pat: number;
  target: [number, number];
  zoom: number;
  onPet: () => void;
  onMove: (x: number, z: number) => void;
  onItem: (item: WorldObject) => void;
  onCharacter: (name: string) => void;
  onImagine: (name: string) => void;
}) {
  const moon = world.scene === "moon";
  const help = world.scene === "help";
  const imaginations = world.imaginations || [];
  return (
    <>
      <color attach="background" args={[moon ? "#aaa2cc" : "#c9ede7"]} />
      <fog attach="fog" args={[moon ? "#aaa2cc" : "#c9ede7", 24, 60]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#fffaec", "#8fac88", 0.75]} />
      <directionalLight
        position={[-6, 14, 7]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-normalBias={0.05}
      />
      <CameraRig zoom={zoom} />
      <group position={[0, -0.65, 0]}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[7.6, 6.7, 1.1, 64]} />
          <meshStandardMaterial color={moon ? "#b4a9c6" : "#91b774"} />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <cylinderGeometry args={[6.7, 4.9, 1.7, 14]} />
          <meshStandardMaterial
            color={moon ? "#9990b0" : "#bb9976"}
            flatShading
          />
        </mesh>
      </group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.07, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          if (e.point.x ** 2 + e.point.z ** 2 < 43)
            onMove(e.point.x, e.point.z);
        }}
      >
        <circleGeometry args={[7.6, 64]} />
        <meshStandardMaterial color={moon ? "#d6c9df" : "#c4db93"} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.035, 0.8]}
        receiveShadow
      >
        <circleGeometry args={[3.45, 48]} />
        <meshStandardMaterial color={moon ? "#e1d7e4" : "#e8dcae"} />
      </mesh>
      {help && (
        <>
          <Box
            position={[2.4, -0.005, 0.1]}
            size={[1.7, 0.05, 11]}
            color="#83c9d7"
          />
          {Array.from({ length: 6 }, (_, i) => (
            <Box
              key={i}
              position={[2.1 + (i % 2) * 0.4, 0.035, -4 + i * 1.7]}
              size={[0.5, 0.01, 0.025]}
              color="#d4f2e9"
            />
          ))}
          {world.objects.includes("bridge") && (
            <group
              onClick={(e) => {
                e.stopPropagation();
                onItem("bridge");
              }}
            >
              <Bridge />
            </group>
          )}
          {world.events.includes("safe_path") && (
            <Tube
              points={[
                [0.5, 0.02, 3],
                [0.3, 0.02, -4],
                [2, 0.02, -5.2],
                [4, 0.02, -3],
                [4, 0.02, 2],
              ]}
              color="#f1d683"
              radius={0.12}
            />
          )}
          <Label
            text="ওপারে ফুলবাগান!"
            position={[4.4, 1.4, -0.5]}
            width={2.7}
          />
        </>
      )}
      {!moon && (
        <>
          {[
            [-5, 0, -2.5],
            [-4, 0, -4.4],
            [3.8, 0, -4.2],
            [5.5, 0, -1.7],
            [-5.8, 0, 1.5],
            [0.4, 0, -5.8],
          ].map((p, i) => (
            <Tree
              key={i}
              position={p as V3}
              scale={0.8 + (i % 3) * 0.2}
              color={["#8fbd8f", "#9bc494", "#7fb390"][i % 3]}
            />
          ))}
          {Array.from({ length: 32 }, (_, i) => {
            const a = i * 2.4,
              r = 5.2 + Math.sin(i * 3.2) * 1.3;
            return (
              <Flower
                key={i}
                position={[Math.sin(a) * r, 0, Math.cos(a) * r]}
                color={["#f1a8b7", "#fff1b1", "#b8a1dd"][i % 3]}
                scale={0.5 + (i % 3) * 0.2}
              />
            );
          })}
          <Cloud position={[-10, 5, -10]} scale={1.4} />
          <Cloud position={[9, 6, -7]} scale={1.2} />
          <Cloud position={[-2, 7, -15]} scale={1.9} />
        </>
      )}
      {world.scene === "castle" && <Castle color={shades[world.color]} />}
      {["restaurant", "shop"].includes(world.scene) && (
        <Restaurant shop={world.scene === "shop"} />
      )}
      {world.scene === "stage" && (
        <group position={[0, 0, -2.6]}>
          <Box position={[0, 0.2, 0]} size={[4, 0.4, 2.3]} color="#c8a286" />
          <Box position={[0, 2, -0.9]} size={[4, 3.7, 0.2]} color="#a28bc1" />
          <Box
            position={[-1.65, 2, 0.2]}
            size={[0.7, 3.6, 0.3]}
            color="#dda6b9"
          />
          <Box
            position={[1.65, 2, 0.2]}
            size={[0.7, 3.6, 0.3]}
            color="#dda6b9"
          />
          <Label text="তোমার গল্পের মঞ্চ" position={[0, 4, 0]} width={3} />
        </group>
      )}
      {world.scene === "hospital" && (
        <group position={[0, 0, -2.6]}>
          <Box position={[0, 1.1, 0]} size={[3.2, 2.2, 1.6]} color="#f9e6cf" />
          <Cone
            position={[0, 2.9, 0]}
            radius={2.3}
            height={1.5}
            color="#afa0cc"
          />
          <Box
            position={[0, 1.5, 0.85]}
            size={[0.25, 0.9, 0.08]}
            color="#dba2ab"
          />
          <Box
            position={[0, 1.5, 0.85]}
            size={[0.9, 0.25, 0.08]}
            color="#dba2ab"
          />
          <Label text="মিঠুর যত্নের ঘর" position={[0, 3.9, 0]} width={3} />
        </group>
      )}
      {moon && (
        <>
          <Ball position={[-7, 6, -12]} radius={2.8} color="#f6eacc" />
          {Array.from({ length: 15 }, (_, i) => (
            <Ball
              key={i}
              position={[
                Math.sin(i * 3) * 14,
                4 + (i % 5),
                -5 - Math.cos(i * 3) * 8,
              ]}
              radius={0.05}
              color="#fff5c8"
            />
          ))}
          <Cone
            position={[-3, 1.5, -2]}
            radius={0.75}
            height={2.6}
            color="#f2e9d7"
          />
          <Ball
            position={[-3, 1.6, -1.55]}
            radius={0.25}
            scale={[1, 1, 0.25]}
            color="#a8cada"
          />
        </>
      )}
      {world.objects
        .filter((o) => o !== "bridge" || !help)
        .map((kind, i) => (
          <group key={kind}>
            {kind === "ball" ? (
              <BouncingBall
                key={world.events.filter((e) => e === "ball_play").length}
                position={[
                  -2.8 + (i % 5) * 1.3,
                  0.03,
                  3.2 + Math.floor(i / 5) * 1.1,
                ]}
                active={world.events.includes("ball_play")}
                onClick={() => onItem(kind)}
              />
            ) : (
              <Item
                kind={kind}
                position={[
                  -2.8 + (i % 5) * 1.3,
                  0.03,
                  3.2 + Math.floor(i / 5) * 1.1,
                ]}
                onClick={() => onItem(kind)}
              />
            )}
            <Label
              text={labels[kind]}
              position={[
                -2.8 + (i % 5) * 1.3,
                0.95,
                3.2 + Math.floor(i / 5) * 1.1,
              ]}
              width={0.9}
            />
          </group>
        ))}
      {imaginations.slice(-6).map((item, i) => (
        <Imagination
          key={item.name + i}
          item={item}
          index={i}
          onClick={() => onImagine(item.name)}
        />
      ))}
      {world.characters.includes("dragon") && (
        <Dragon
          position={[3.3, 0, 1.5]}
          fed={world.events.includes("dragon_fed")}
          onClick={() => onCharacter("dragon")}
        />
      )}
      {world.characters.includes("rabbit") && (
        <Bunny position={[-2.9, 0, 0.5]} />
      )}
      {world.characters.includes("bird") && <Bird position={[2, 2.9, 1]} />}
      <Mithu mood={mood} target={target} pat={pat} onPet={onPet} />
      <Fireflies />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial transparent opacity={0.065} />
      </mesh>
    </>
  );
}
export function GameWorld(props: Parameters<typeof Scene>[0]) {
  const [lost, setLost] = useState(false);
  const [supported] = useState(() => {
    try {
      const c = document.createElement("canvas");
      return !!c.getContext("webgl2");
    } catch {
      return false;
    }
  });
  return (
    <div
      className="game-canvas"
      data-scene={props.world.scene}
      data-role={props.world.role}
      aria-label={`3D ${labels[props.world.scene]}`}
    >
      {supported && !lost ? (
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [8.8, 8.3, 13.5], fov: 43, near: 0.1, far: 120 }}
          gl={{ antialias: true, powerPreference: "low-power" }}
          onCreated={({ gl }) => {
            gl.setClearColor("#c9ede7");
            gl.domElement.addEventListener("webglcontextlost", () =>
              setLost(true),
            );
          }}
        >
          <Scene {...props} />
        </Canvas>
      ) : (
        <div className="webgl-error">
          <h2>এই ডিভাইসে 3D চালু করা যায়নি</h2>
          <p>
            WebGL2-সহ Chrome / Edge চেষ্টা করো। তোমার গল্প ও কথা বলার সুযোগ রয়ে
            গেছে।
          </p>
          <button onClick={() => location.reload()}>আবার চেষ্টা</button>
        </div>
      )}
    </div>
  );
}

function BouncingBall({
  position,
  active,
  onClick,
}: {
  position: V3;
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((_s, dt) => {
    elapsed.current += dt;
    if (ref.current && active) {
      const t = Math.min(elapsed.current, 3);
      ref.current.position.y =
        position[1] + Math.abs(Math.sin(t * 5)) * Math.max(0, 1 - t / 3) * 1.6;
      ref.current.rotation.z = t * 2;
    }
  });
  return (
    <group ref={ref} position={position}>
      <Item kind="ball" position={[0, 0, 0]} onClick={onClick} />
    </group>
  );
}
