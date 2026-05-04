import React from 'react';
import Svg, { Path, G } from 'react-native-svg';
import { Colors } from '../constants/Colors';

interface Props {
  size?: number;
  color?: string;
}

export const CairnLogo = ({ size = 100, color = Colors.text }: Props) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeJoin="round">
        {/* Hand-drawn Top Rock - Organic shape */}
        <Path d="M46 25 C 42 21, 55 20, 58 24 C 62 28, 50 31, 46 29 C 42 27, 44 26, 46 25" />
        
        {/* Hand-drawn Middle Rock - Slightly wider, irregular */}
        <Path d="M38 42 C 32 35, 65 34, 70 40 C 74 46, 60 52, 45 53 C 35 54, 32 48, 38 42" />
        
        {/* Hand-drawn Bottom Rock - Solid base, sketched feel */}
        <Path d="M28 65 C 20 55, 75 54, 82 62 C 88 72, 70 80, 45 82 C 25 84, 22 75, 28 65" />
      </G>
    </Svg>
  );
};
