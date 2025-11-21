"use client"

import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Box, Torus, Octahedron, Text3D, Center } from '@react-three/drei'
import * as THREE from 'three'

// Floating code symbols particles
function FloatingCodeParticles({ count = 80 }) {
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const temp = useRef(new THREE.Object3D())
  const colors = useRef<THREE.Color[]>([])

  useEffect(() => {
    if (mesh.current) {
      // Tech color palette
      const techColors = [
        new THREE.Color('#3b82f6'), // blue
        new THREE.Color('#6366f1'), // indigo
        new THREE.Color('#06b6d4'), // cyan
        new THREE.Color('#10b981'), // emerald
        new THREE.Color('#8b5cf6'), // violet
      ]

      for (let i = 0; i < count; i++) {
        temp.current.position.set(
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 25
        )
        temp.current.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        )
        const scale = Math.random() * 0.3 + 0.2
        temp.current.scale.setScalar(scale)
        temp.current.updateMatrix()
        mesh.current.setMatrixAt(i, temp.current.matrix)
        
        colors.current[i] = techColors[Math.floor(Math.random() * techColors.length)]
        mesh.current.setColorAt(i, colors.current[i])
      }
      mesh.current.instanceMatrix.needsUpdate = true
      if (mesh.current.instanceColor) {
        mesh.current.instanceColor.needsUpdate = true
      }
    }
  }, [count])

  useFrame((state) => {
    if (mesh.current) {
      for (let i = 0; i < count; i++) {
        mesh.current.getMatrixAt(i, temp.current.matrix)
        temp.current.rotation.x += 0.008
        temp.current.rotation.y += 0.008
        temp.current.position.y += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.002
        temp.current.position.x += Math.cos(state.clock.elapsedTime * 0.3 + i) * 0.001
        temp.current.updateMatrix()
        mesh.current.setMatrixAt(i, temp.current.matrix)
      }
      mesh.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.15, 0.15, 0.15]} />
      <meshStandardMaterial transparent opacity={0.6} />
    </instancedMesh>
  )
}

// Animated tech shapes representing code modules/packages
function AnimatedTechShapes() {
  const groupRef = useRef<THREE.Group>(null!)
  const cubesRef = useRef<THREE.Mesh[]>([])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
    }

    // Animate individual cubes
    cubesRef.current.forEach((cube, i) => {
      if (cube) {
        cube.rotation.x += 0.01
        cube.rotation.y += 0.01
        cube.position.y += Math.sin(state.clock.elapsedTime + i) * 0.001
      }
    })
  })

  return (
    <group ref={groupRef}>
      {/* Central wireframe sphere - representing connectivity */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial 
          color="#6366f1" 
          transparent 
          opacity={0.15}
          wireframe
        />
      </mesh>
      
      {/* Orbiting code modules (cubes) */}
      <Box 
        ref={(el) => { if (el) cubesRef.current[0] = el }}
        args={[0.6, 0.6, 0.6]} 
        position={[3.5, 0, 0]}
      >
        <meshStandardMaterial 
          color="#3b82f6" 
          transparent 
          opacity={0.7} 
          metalness={0.5}
          roughness={0.2}
        />
      </Box>
      
      <Box 
        ref={(el) => { if (el) cubesRef.current[1] = el }}
        args={[0.5, 0.5, 0.5]} 
        position={[-3.5, 0, 0]}
      >
        <meshStandardMaterial 
          color="#06b6d4" 
          transparent 
          opacity={0.7}
          metalness={0.5}
          roughness={0.2}
        />
      </Box>
      
      <Box 
        ref={(el) => { if (el) cubesRef.current[2] = el }}
        args={[0.4, 0.4, 0.4]} 
        position={[0, 3.5, 0]}
      >
        <meshStandardMaterial 
          color="#10b981" 
          transparent 
          opacity={0.7}
          metalness={0.5}
          roughness={0.2}
        />
      </Box>
      
      <Box 
        ref={(el) => { if (el) cubesRef.current[3] = el }}
        args={[0.5, 0.5, 0.5]} 
        position={[0, -3.5, 0]}
      >
        <meshStandardMaterial 
          color="#8b5cf6" 
          transparent 
          opacity={0.7}
          metalness={0.5}
          roughness={0.2}
        />
      </Box>
      
      {/* Torus - representing infinite loop/cycle */}
      <Torus args={[2, 0.2, 16, 32]} position={[0, 0, 0]} rotation={[Math.PI / 4, 0, 0]}>
        <meshStandardMaterial 
          color="#6366f1" 
          transparent 
          opacity={0.4}
          metalness={0.6}
          roughness={0.3}
        />
      </Torus>
      
      {/* Small octahedrons - representing data nodes */}
      <Octahedron args={[0.5]} position={[2.5, 2, 1]}>
        <meshStandardMaterial 
          color="#f59e0b" 
          transparent 
          opacity={0.6}
          metalness={0.5}
          roughness={0.2}
        />
      </Octahedron>
      
      <Octahedron args={[0.4]} position={[-2.5, -2, -1]}>
        <meshStandardMaterial 
          color="#ec4899" 
          transparent 
          opacity={0.6}
          metalness={0.5}
          roughness={0.2}
        />
      </Octahedron>

      {/* Additional small cubes scattered around */}
      <Box args={[0.3, 0.3, 0.3]} position={[2, -1.5, 2]}>
        <meshStandardMaterial 
          color="#14b8a6" 
          transparent 
          opacity={0.5}
          metalness={0.5}
          roughness={0.2}
        />
      </Box>
      
      <Box args={[0.25, 0.25, 0.25]} position={[-2, 1.5, -2]}>
        <meshStandardMaterial 
          color="#a855f7" 
          transparent 
          opacity={0.5}
          metalness={0.5}
          roughness={0.2}
        />
      </Box>
    </group>
  )
}

// Grid plane for tech aesthetic
function GridPlane() {
  const gridRef = useRef<THREE.GridHelper>(null!)
  
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.y = -4 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2
    }
  })

  return (
    <gridHelper 
      ref={gridRef}
      args={[20, 20, '#3b82f6', '#1e40af']} 
      position={[0, -4, 0]}
    />
  )
}

// Main 3D scene
function Scene() {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(0, 2, 10)
  }, [camera])

  return (
    <>
      {/* Lighting setup for tech feel */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#3b82f6" />
      <pointLight position={[-10, -10, -10]} intensity={0.6} color="#6366f1" />
      <pointLight position={[0, 10, -10]} intensity={0.4} color="#06b6d4" />
      <spotLight 
        position={[0, 15, 0]} 
        angle={0.3} 
        penumbra={1} 
        intensity={0.5}
        color="#8b5cf6"
      />
      
      <FloatingCodeParticles count={60} />
      <AnimatedTechShapes />
      <GridPlane />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.4}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 3}
      />
    </>
  )
}

// Error Boundary Component
class ThreeJSErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Three.js Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-950 dark:via-blue-950/50 dark:to-indigo-950" />
      )
    }

    return this.props.children
  }
}

// Main component
export function ThreeJSBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-slate-950 dark:via-blue-950/50 dark:to-indigo-950"></div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Fallback gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/80 via-blue-50/40 to-indigo-50/80 dark:from-slate-950/80 dark:via-blue-950/40 dark:to-indigo-950/80"></div>
      
      {/* Three.js Canvas with Error Boundary */}
      <ThreeJSErrorBoundary>
        <Canvas
          camera={{ position: [0, 2, 10], fov: 60 }}
          style={{ background: 'transparent' }}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene />
        </Canvas>
      </ThreeJSErrorBoundary>
    </div>
  )
}