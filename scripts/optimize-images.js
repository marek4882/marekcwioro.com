const sharp = require('sharp');
const { glob } = require('glob'); // ZMIANA: Nowy sposób importu dla wersji 10+
const path = require('path');
const fs = require('fs');

// Konfiguracja rozmiarów
const sizes = {
    lg: 1920, // Desktop
    md: 1200, // Laptop
    sm: 800,  // Tablet/Duży telefon
    xs: 480   // Mały telefon
};

// Funkcja czyszcząca nazwy plików
function sanitizeName(name) {
    return name
        .toLowerCase()
        .replace(/\s+\(\d+\)/g, '') // Usuwa " (1)", " (2)"
        .replace(/\s+/g, '-')       // Zamienia spacje na myślniki
        .replace(/[^a-z0-9-]/g, ''); // Usuwa dziwne znaki
}

console.log("🚀 Rozpoczynam optymalizację obrazów...");

// ZMIANA: '../assets' bo skrypt jest w folderze 'scripts', a assets są wyżej
const searchPath = "../assets/img/**/*.{jpg,jpeg,png,webp}"; 

// ZMIANA: Nowa wersja glob używa Promises (.then) zamiast callbacka
glob(searchPath, { ignore: "**/*-+(lg|md|sm|xs).*" })
    .then(files => {
        if (files.length === 0) {
            console.log("❌ Nie znaleziono żadnych zdjęć! Sprawdź czy folder 'assets' jest obok folderu 'scripts'.");
            console.log(`Szukana ścieżka: ${path.resolve(searchPath)}`);
            return;
        }

        console.log(`🔎 Znaleziono ${files.length} plików do przetworzenia.`);

        files.forEach(file => {
            // Musimy naprawić ścieżki, bo glob w Windows może zwracać '/' zamiast '\'
            const normalizedFile = path.resolve(file);
            const dir = path.dirname(normalizedFile);
            const ext = path.extname(normalizedFile);
            const originalName = path.basename(normalizedFile, ext);
            
            // WERSJA BEZPIECZNA (Zostawia oryginalną nazwę, tylko zamienia spacje na myślniki)
            const safeName = originalName.replace(/[\s()]/g, '-').replace(/-+/g, '-').toLowerCase();

            Object.entries(sizes).forEach(([sizeName, width]) => {
                const outputPath = path.join(dir, `${safeName}-${sizeName}.webp`);

                if (!fs.existsSync(outputPath)) {
                    sharp(normalizedFile)
                        .resize({ width: width, withoutEnlargement: true })
                        .webp({ quality: 80 })
                        .toFile(outputPath)
                        .then(() => console.log(`✅ Utworzono: ${safeName}-${sizeName}.webp`))
                        .catch(err => console.error(`❌ Błąd przy ${file}:`, err));
                }
            });
        });
    })
    .catch(err => {
        console.error("Krytyczny błąd skryptu:", err);
    });