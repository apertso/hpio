#!/bin/bash

# Настройки
PROJECT_ROOT="/c/Users/ArturPertsevCSDev/Projects/demo-service/payment-service"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
OUTPUT_FILE="$PROJECT_ROOT/fe_code.tmp"
FINAL_OUTPUT="$PROJECT_ROOT/fe_code.txt"

# Исключаемые директории (относительно frontend)
EXCLUDED_DIRS=("node_modules" "dist" "build" "public" ".cache" ".next" ".nuxt" "__sapper__" "out" "storybook-static")

# Исключаемые файлы (по имени)
EXCLUDED_FILES=("package-lock.json" "yarn.lock" ".env" ".env.*" "*.local" "*.bak" "*.tmp" "*.log" "*.min.*")

# Исключаемые расширения (бинарные и временные файлы)
EXCLUDED_EXTENSIONS=("exe" "dll" "so" "a" "lib" "jar"
                     "png" "jpg" "jpeg" "gif" "bmp" "ico" "svg" "webp"
                     "pdf" "doc*" "xls*" "ppt*"
                     "zip" "tar.*" "gz" "rar" "7z"
                     "mp3" "wav" "mp4" "avi" "mov"
                     "db" "sqlite" "mdb"
                     "log" "tlog" "cache" "swp" "swo")

# Очищаем временный файл
> "$OUTPUT_FILE"

should_exclude() {
    local file=$1

    # Проверка директорий
    for dir in "${EXCLUDED_DIRS[@]}"; do
        if [[ $file == *"/$dir/"* ]]; then
            return 0
        fi
    done

    # Получаем только имя файла для проверки по имени и расширению
    local filename=$(basename "$file")

    # Проверка файлов по имени (теперь сравниваем с именем файла, а не полным путем)
    for pattern in "${EXCLUDED_FILES[@]}"; do
        # Используем case для более гибкого сопоставления с шаблонами имен файлов
        case "$filename" in
            $pattern)
                return 0
                ;;
        esac
    done

    # Проверка по расширению (теперь сравниваем с именем файла)
    for ext in "${EXCLUDED_EXTENSIONS[@]}"; do
        # Используем case для сопоставления расширений
        case "$filename" in
            *.$ext)
                return 0
                ;;
        esac
    done

    # Игнорируем скрытые файлы (кроме .env.local и подобных)
    if [[ $filename == .* && ! $filename == .env.* ]]; then
        return 0
    fi

    return 1
}

# Основной цикл
find "$FRONTEND_DIR" -type f | while read -r file; do
    if should_exclude "$file"; then
        continue # Пропускаем файл, если он должен быть исключен
    fi

    REL_PATH=${file#"$FRONTEND_DIR/"}
    echo -e "\n\n=== $REL_PATH ===" >> "$OUTPUT_FILE"

    # Проверяем, является ли файл текстовым (оставляем исходную логику)
    if file -b --mime-encoding "$file" | grep -q 'binary'; then
        echo "[BINARY FILE CONTENT OMITTED]" >> "$OUTPUT_FILE"
    else
        # Особые случаи для минифицированных файлов (проверка по имени файла)
        if [[ $(basename "$file") == *.min.* ]]; then
             echo "[MINIFIED FILE CONTENT OMITTED]" >> "$OUTPUT_FILE"
        else
            cat "$file" >> "$OUTPUT_FILE"
        fi
    fi
done

# Финализация
mv "$OUTPUT_FILE" "$FINAL_OUTPUT"
echo "Frontend code successfully exported to $FINAL_OUTPUT"