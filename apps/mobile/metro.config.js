const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Tambahkan ekstensi 'tflite' ke dalam assetExts agar Metro sanggup memuat file model AI lokal (.tflite)
config.resolver.assetExts.push('tflite');

module.exports = config;
