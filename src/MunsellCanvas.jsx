import React, { useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const MunsellColorSphere = ({ color, hvc }) => {
    const [H, V, C] = hvc;
    const rad = (H / 40.0) * 2 * Math.PI;
    const x = Math.sin(rad) * C * 1.5;
    const y = Math.cos(rad) * C * 1.5;
    const z = V * 5 - 20;
    const threeColor = useMemo(() => new THREE.Color(color), [color]);

    return (
        <mesh position={[y, z, x]}>
            <sphereGeometry args={[0.5, 4, 4]} />
            <meshBasicMaterial color={threeColor} />
        </mesh>
    );
};

const ColorCube = ({ color, hvc, size = 1.5, emissive = false }) => {
    const [H, V, C] = hvc;
    const rad = (H / 40.0) * 2 * Math.PI;
    const x = Math.sin(rad) * C * 1.5;
    const y = Math.cos(rad) * C * 1.5;
    const z = V * 5 - 20;
    const threeColor = useMemo(() => new THREE.Color(color), [color]);
    const emissiveColor = useMemo(() => emissive ? threeColor : new THREE.Color('black'), [emissive, threeColor]);

    return (
        <mesh position={[y, z, x]}>
            <boxGeometry args={[size, size, size]} />
            <meshStandardMaterial color={threeColor} emissive={emissiveColor} />
        </mesh>
    );
};

const MunsellColors = () => {
    const [munsellColors, setMunsellColors] = useState([]);

    useEffect(() => {
        fetch('munsell/colorcodeToHVC.txt')
            .then((response) => response.text())
            .then((text) => {
                const colors = text.split('\n').map((line) => {
                    const parts = line.split('\t');
                    if (parts.length < 4) return null;
                    return {
                        hex: parts[0],
                        hvc: [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])],
                    };
                }).filter(Boolean);
                setMunsellColors(colors);
            });
    }, []);

    return (
        <>
            {munsellColors.map((color, i) => (
                <MunsellColorSphere key={i} color={color.hex} hvc={color.hvc} />
            ))}
        </>
    );
};

const findClosestMunsell = (rgb, munsellData) => {
    let closestColor = null;
    let minDistance = Infinity;

    const munsellColors = munsellData.map(line => {
        const parts = line.split('\t');
        if (parts.length < 4) return null;
        const hex = parts[0];
        const munsellRgb = new THREE.Color(hex).toArray().map(c => c * 255);
        return {
            hex,
            hvc: [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])],
            rgb: munsellRgb
        };
    }).filter(Boolean);

    munsellColors.forEach(munsellColor => {
        if (!munsellColor.rgb) return;
        const distance = Math.sqrt(
            Math.pow(rgb[0] - munsellColor.rgb[0], 2) +
            Math.pow(rgb[1] - munsellColor.rgb[1], 2) +
            Math.pow(rgb[2] - munsellColor.rgb[2], 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestColor = munsellColor;
        }
    });
    return closestColor;
};

const SampleColors = ({ munsellData }) => {
    const sampleColors = [
        "255,0,0", // Red
        "0,255,0", // Green
        "0,0,255", // Blue
        "255,255,0", // Yellow
        "0,255,255", // Cyan
        "255,0,255", // Magenta
    ];

    const closestColors = useMemo(() => {
        if (!munsellData) return [];
        return sampleColors.map(colorStr => {
            const rgb = colorStr.split(',').map(c => parseInt(c, 10));
            const closest = findClosestMunsell(rgb, munsellData);
            return { color: `rgb(${colorStr})`, hvc: closest ? closest.hvc : null };
        }).filter(item => item.hvc);
    }, [munsellData]);

    return (
        <>
            {closestColors.map((item, i) => (
                <ColorCube key={i} color={item.color} hvc={item.hvc} />
            ))}
        </>
    );
};

const ExtractedColors = ({ extractedColors, munsellData }) => {
    const closestColors = useMemo(() => {
        console.log('ExtractedColors received:', extractedColors);
        if (!extractedColors || !munsellData) return [];
        const mappedColors = extractedColors.map(color => {
            const rgb = color;
            const closest = findClosestMunsell(rgb, munsellData);
            return { color: `rgb(${rgb.join(',')})`, hvc: closest ? closest.hvc : null };
        });
        console.log('Mapped colors:', mappedColors);
        const filteredColors = mappedColors.filter(item => item.hvc);
        console.log('Filtered colors:', filteredColors);
        return filteredColors;
    }, [extractedColors, munsellData]);

    return (
        <>
            {closestColors.map((item, i) => (
                <ColorCube key={i} color={item.color} hvc={item.hvc} size={2.5} emissive={true} />
            ))}
        </>
    );
};


const MunsellCanvas = ({ extractedColors }) => {
    const [munsellData, setMunsellData] = useState(null);

    useEffect(() => {
        fetch('munsell/colorcodeToHVC.txt')
            .then((response) => response.text())
            .then((text) => {
                setMunsellData(text.split('\n'));
            });
    }, []);

    return (
        <Canvas camera={{ position: [0, 0, 150] }} style={{ width: '100%', height: '100%' }}>
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <MunsellColors />
            {munsellData && <SampleColors munsellData={munsellData} />}
            {munsellData && <ExtractedColors extractedColors={extractedColors} munsellData={munsellData} />}
            <OrbitControls 
                enableDamping 
                dampingFactor={0.2} 
                enablePan={false} 
                minDistance={50} 
                maxDistance={200} 
            />
        </Canvas>
    );
};

export default MunsellCanvas;