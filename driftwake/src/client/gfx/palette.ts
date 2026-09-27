/**
 * Color palettes: themes (sky/ground/accents per ThemeId), class outfit defaults, weapon defaults.
 */
import type { ThemeId, ClassId, WeatherId } from '@shared/types';

export interface ThemePalette {
  /** sky gradient top -> bottom */
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  /** sun/moon glow color */
  glow: string;
  /** silhouette color for far background shapes (whales, islands, ruins) */
  farSilhouette: string;
  midSilhouette: string;
  /** ground top tile color, ground fill color */
  groundTop: string;
  groundFill: string;
  groundAccent: string;
  oneway: string;
  solid: string;
  rope: string;
  fog?: string;
  weather: WeatherId;
  dark?: boolean;
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  driftmoor: {
    skyTop: '#3b3468', skyMid: '#a85a6a', skyBottom: '#f2a35d', glow: '#ffd98a',
    farSilhouette: '#5b4a72', midSilhouette: '#7a5a68',
    groundTop: '#7a9b5a', groundFill: '#5a4636', groundAccent: '#8a6a4a',
    oneway: '#a9784a', solid: '#6b5847', rope: '#c9a15c', weather: 'none',
  },
  meadow: {
    skyTop: '#4a72b0', skyMid: '#89b4d6', skyBottom: '#f4dfa0', glow: '#fff2b0',
    farSilhouette: '#6f8fae', midSilhouette: '#7fae7a',
    groundTop: '#7ec850', groundFill: '#5a4636', groundAccent: '#4f9e3d',
    oneway: '#b98a52', solid: '#7a6248', rope: '#c9a15c', weather: 'none',
  },
  grotto: {
    skyTop: '#0d1f22', skyMid: '#123230', skyBottom: '#1c4a45', glow: '#5be2c9',
    farSilhouette: '#0a2b2b', midSilhouette: '#154440',
    groundTop: '#3e6e63', groundFill: '#28382f', groundAccent: '#5be2c9',
    oneway: '#3a5a52', solid: '#324840', rope: '#7fae9c', weather: 'none', dark: true,
  },
  kelpwood: {
    skyTop: '#0e3a2e', skyMid: '#1f6b4a', skyBottom: '#e8c25a', glow: '#c8e05a',
    farSilhouette: '#124430', midSilhouette: '#1c5c3e',
    groundTop: '#2f7a4f', groundFill: '#274430', groundAccent: '#9fd35a',
    oneway: '#3f6a3a', solid: '#2c4230', rope: '#6a9a4e', weather: 'bubbles',
  },
  galeoutpost: {
    skyTop: '#3a4d7a', skyMid: '#7891bd', skyBottom: '#dfe4ea', glow: '#fff6d8',
    farSilhouette: '#586a94', midSilhouette: '#8b9bb8',
    groundTop: '#8a6a48', groundFill: '#5c4530', groundAccent: '#c9b088',
    oneway: '#7a5c3e', solid: '#66503a', rope: '#9c7a4e', weather: 'wind',
  },
  stormspire: {
    skyTop: '#181c2c', skyMid: '#333a54', skyBottom: '#5a5c74', glow: '#c9d6ff',
    farSilhouette: '#22283c', midSilhouette: '#3a4058',
    groundTop: '#5a5c6a', groundFill: '#33333e', groundAccent: '#7a7c8c',
    oneway: '#4a4c5c', solid: '#3c3d4a', rope: '#8a8a9a', weather: 'storm', dark: true,
  },
  lanternreef: {
    skyTop: '#040a1e', skyMid: '#0a1840', skyBottom: '#12295c', glow: '#5adfff',
    farSilhouette: '#0a1230', midSilhouette: '#122a4a',
    groundTop: '#1c3a5a', groundFill: '#0e1c30', groundAccent: '#5adfff',
    oneway: '#1e3c52', solid: '#162a3e', rope: '#3a6a7a', weather: 'fireflies', dark: true,
  },
  galleon: {
    skyTop: '#03140f', skyMid: '#062018', skyBottom: '#0a2f22', glow: '#4dffb0',
    farSilhouette: '#041a14', midSilhouette: '#0c2a20',
    groundTop: '#2e4a3a', groundFill: '#152620', groundAccent: '#3f6b52',
    oneway: '#2a4436', solid: '#1c332a', rope: '#4a6b58', weather: 'none', dark: true,
  },
  hollow: {
    skyTop: '#160a1e', skyMid: '#2a0f30', skyBottom: '#3d1440', glow: '#b25be0',
    farSilhouette: '#1c0c26', midSilhouette: '#301238',
    groundTop: '#5a2a5e', groundFill: '#2c1230', groundAccent: '#8b3fae',
    oneway: '#4a2450', solid: '#361c3c', rope: '#7a3a80', weather: 'spores', dark: true,
  },
  heart: {
    skyTop: '#1c0508', skyMid: '#340810', skyBottom: '#4a0e18', glow: '#ff2f4f',
    farSilhouette: '#240509', midSilhouette: '#3a0c14',
    groundTop: '#6e1a2a', groundFill: '#33090f', groundAccent: '#c92f4a',
    oneway: '#5a1622', solid: '#3f0f18', rope: '#8a2436', weather: 'spores', dark: true,
  },
};

export const CLASS_COLORS: Record<ClassId, string> = {
  vanguard: '#7a8a9a',
  stormcaller: '#6a5ac9',
  windrunner: '#4a9a5e',
  shade: '#5a4a5e',
};

export const OUTLINE = '#1a1218';
