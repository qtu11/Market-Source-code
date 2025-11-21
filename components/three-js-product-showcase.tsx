"use client"

import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Box, Sphere, Cylinder, Cone, Torus } from '@react-three/drei'
import * as THREE from 'three'

// Interactive 3D product representation
function ProductModel({ type = 'box' }: { type?: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
      meshRef.current.scale.setScalar(hovered ? 1.1 : 1)
    }
  })

  const getGeometry = () => {
    switch (type) {
      case 'sphere':
        return <Sphere args={[1, 32, 32]} />
      case 'cylinder':
        return <Cylinder args={[0.8, 0.8, 1.5, 32]} />
      case 'cone':
        return <Cone args={[0.8, 1.5, 32]} />
      case 'torus':
        return <Torus args={[1, 0.3, 16, 32]} />
      default:
        return <Box args={[1, 1, 1]} />
    }
  }

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {getGeometry()}
      <meshStandardMaterial 
        color={hovered ? "#ec4899" : "#8b5cf6"} 
        transparent 
        opacity={0.8}
        metalness={0.7}
        roughness={0.3}
      />
    </mesh>
  )
}

// Floating code blocks
function FloatingCodeBlocks() {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        child.rotation.y = state.clock.elapsedTime * (0.5 + index * 0.1)
        child.position.y = Math.sin(state.clock.elapsedTime + index) * 0.2
      })
    }
  })

  return (
    <group ref={groupRef}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Box
          key={i}
          args={[0.3, 0.3, 0.3]}
          position={[
            Math.cos(i * Math.PI / 3) * 3,
            Math.sin(i * Math.PI / 3) * 0.5,
            Math.sin(i * Math.PI / 3) * 2
          ]}
        >
          <meshStandardMaterial 
            color={`hsl(${i * 60}, 70%, 60%)`} 
            transparent 
            opacity={0.6}
          />
        </Box>
      ))}
    </group>
  )
}

// Animated wireframe grid
function WireframeGrid() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <mesh ref={meshRef} position={[0, -2, 0]}>
      <planeGeometry args={[8, 8, 32, 32]} />
      <meshBasicMaterial 
        color="#a855f7" 
        wireframe 
        transparent 
        opacity={0.3}
      />
    </mesh>
  )
}

// Main scene
function ProductScene() {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(0, 0, 8)
  }, [camera])

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      
      <ProductModel type="box" />
      <FloatingCodeBlocks />
      <WireframeGrid />
    </>
  )
}

// Main component
export function ThreeJSProductShowcase() {
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
      
      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
      >
        <ProductScene />
      </Canvas>
    </div>
  )
}
