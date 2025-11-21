"use client"

import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Box, Sphere, Cylinder, Cone, Torus, Text3D, Center } from '@react-three/drei'
import * as THREE from 'three'

// Data visualization cubes
function DataCubes() {
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
      {/* User data cube */}
      <Box args={[0.8, 0.8, 0.8]} position={[-3, 0, 0]}>
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.7} />
      </Box>
      
      {/* Product data cube */}
      <Box args={[0.6, 0.6, 0.6]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#10b981" transparent opacity={0.7} />
      </Box>
      
      {/* Transaction data cube */}
      <Box args={[0.7, 0.7, 0.7]} position={[3, 0, 0]}>
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.7} />
      </Box>
    </group>
  )
}

// Floating admin icons
function AdminIcons() {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <group ref={groupRef}>
      {/* Shield icon (security) */}
      <Cylinder args={[0.3, 0.3, 0.1, 8]} position={[0, 2, 0]}>
        <meshStandardMaterial color="#ef4444" transparent opacity={0.8} />
      </Cylinder>
      
      {/* Settings gear */}
      <Torus args={[0.5, 0.1, 8, 16]} position={[0, -2, 0]}>
        <meshStandardMaterial color="#8b5cf6" transparent opacity={0.8} />
      </Torus>
      
      {/* Analytics sphere */}
      <Sphere args={[0.4, 16, 16]} position={[2, 0, 0]}>
        <meshStandardMaterial color="#06b6d4" transparent opacity={0.6} />
      </Sphere>
      
      {/* Reports cone */}
      <Cone args={[0.3, 0.8, 8]} position={[-2, 0, 0]}>
        <meshStandardMaterial color="#f97316" transparent opacity={0.8} />
      </Cone>
    </group>
  )
}

// Network visualization
function NetworkVisualization() {
  const points = useRef<THREE.Points>(null!)
  const lines = useRef<THREE.LineSegments>(null!)

  useEffect(() => {
    // Create network nodes
    const nodePositions = new Float32Array(15 * 3)
    for (let i = 0; i < 15; i++) {
      nodePositions[i * 3] = (Math.random() - 0.5) * 10
      nodePositions[i * 3 + 1] = (Math.random() - 0.5) * 10
      nodePositions[i * 3 + 2] = (Math.random() - 0.5) * 10
    }

    // Create connections
    const linePositions = new Float32Array(30 * 3)
    for (let i = 0; i < 15; i++) {
      const targetIndex = Math.floor(Math.random() * 15)
      if (targetIndex !== i) {
        linePositions[i * 6] = nodePositions[i * 3]
        linePositions[i * 6 + 1] = nodePositions[i * 3 + 1]
        linePositions[i * 6 + 2] = nodePositions[i * 3 + 2]
        linePositions[i * 6 + 3] = nodePositions[targetIndex * 3]
        linePositions[i * 6 + 4] = nodePositions[targetIndex * 3 + 1]
        linePositions[i * 6 + 5] = nodePositions[targetIndex * 3 + 2]
      }
    }

    if (points.current) {
      points.current.geometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3))
    }
    if (lines.current) {
      lines.current.geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    }
  }, [])

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.1
    }
    if (lines.current) {
      lines.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <group>
      <points ref={points}>
        <bufferGeometry />
        <pointsMaterial size={0.1} color="#a855f7" transparent opacity={0.6} />
      </points>
      <lineSegments ref={lines}>
        <bufferGeometry />
        <lineBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
      </lineSegments>
    </group>
  )
}

// Main scene
function AdminScene() {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(0, 0, 8)
  }, [camera])

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      
      <DataCubes />
      <AdminIcons />
      <NetworkVisualization />
    </>
  )
}

// Main component
export function ThreeJSAdmin() {
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
        <AdminScene />
      </Canvas>
    </div>
  )
}
