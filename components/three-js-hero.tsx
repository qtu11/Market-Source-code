"use client"

import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text3D, Center, Float, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { ThreeJSErrorBoundary } from './three-js-error-boundary'

// Animated text component
function AnimatedText({ children, position = [0, 0, 0] }: { children: string, position?: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.1
    }
  })

  return (
    <Center position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Text3D
          ref={meshRef}
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.8}
          height={0.1}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.02}
          bevelOffset={0}
          bevelSegments={5}
        >
          {children}
          <meshStandardMaterial color="#8b5cf6" />
        </Text3D>
      </Float>
    </Center>
  )
}

// Particle system
function ParticleField({ count = 200 }) {
  const points = useRef<THREE.Points>(null!)
  const positions = useRef<Float32Array>()

  useEffect(() => {
    const positionsArray = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positionsArray[i * 3] = (Math.random() - 0.5) * 20
      positionsArray[i * 3 + 1] = (Math.random() - 0.5) * 20
      positionsArray[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    positions.current = positionsArray
  }, [count])

  useFrame((state) => {
    if (points.current && positions.current) {
      const positions = points.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.001
        positions[i * 3] += Math.cos(state.clock.elapsedTime + i) * 0.0005
      }
      points.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.current!}
          itemSize={3}
          args={[positions.current!, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#a855f7" transparent opacity={0.6} />
    </points>
  )
}

// Rotating geometric shapes
function RotatingShapes() {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = state.clock.elapsedTime * 0.1
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2
    }
  })

  return (
    <group ref={groupRef}>
      {/* Central icosahedron */}
      <mesh position={[0, 0, 0]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color="#ec4899" 
          transparent 
          opacity={0.3}
          wireframe
        />
      </mesh>
      
      {/* Orbiting rings */}
      <mesh position={[2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.5, 0.1, 8, 16]} />
        <meshStandardMaterial color="#06b6d4" transparent opacity={0.7} />
      </mesh>
      
      <mesh position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.5, 0.1, 8, 16]} />
        <meshStandardMaterial color="#10b981" transparent opacity={0.7} />
      </mesh>
      
      {/* Floating spheres */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.8} />
      </mesh>
      
      <mesh position={[0, -2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

// Main scene
function HeroScene() {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(0, 0, 10)
  }, [camera])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      
      <ParticleField count={150} />
      <RotatingShapes />
      
      {/* 3D Text */}
      <AnimatedText position={[0, 1, 0]}>QTUS</AnimatedText>
      <AnimatedText position={[0, -1, 0]}>DEV</AnimatedText>
    </>
  )
}

// Main component
export function ThreeJSHero() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-pink-100/20 to-blue-100/30 dark:from-purple-900/50 dark:via-pink-900/30 dark:to-blue-900/50"></div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Fallback gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-100/20 via-pink-100/10 to-blue-100/20 dark:from-purple-900/30 dark:via-pink-900/20 dark:to-blue-900/30"></div>
      
      {/* Three.js Canvas with Error Boundary */}
      <ThreeJSErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 10], fov: 75 }}
          style={{ background: 'transparent' }}
          gl={{ antialias: true, alpha: true }}
        >
          <HeroScene />
        </Canvas>
      </ThreeJSErrorBoundary>
    </div>
  )
}
