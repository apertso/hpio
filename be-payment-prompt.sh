#!/bin/bash

# Настройки
PROJECT_ROOT="."
BACKEND_DIR="$PROJECT_ROOT/backend"
OUTPUT_FILE="$PROJECT_ROOT/be_code.tmp"
FINAL_OUTPUT="$PROJECT_ROOT/be_code.txt"

# Исключаемые директории (относительно backend)
EXCLUDED_DIRS=("dist" "uploads" "logs" "node_modules" "bin" "obj" "build" "target" "vendor" "__pycache__")

# Исключаемые файлы (по имени)
EXCLUDED_FILES=("package-lock.json" "yarn.lock" ".env" ".env.*" "*.local" "*.bak" "*.tmp")

# Исключаемые расширения (бинарные и временные файлы)
# Убраны ведущие *, проверка будет выполняться с помощью case на имени файла
EXCLUDED_EXTENSIONS=("exe" "dll" "so" "a" "lib" "jar" "war" "class"
                     "png" "jpg" "jpeg" "gif" "bmp" "ico" "svg"
                     "pdf" "doc*" "xls*" "ppt*" "odt"
                     "zip" "tar.*" "gz" "rar" "7z"
                     "mp3" "wav" "mp4" "avi" "mov"
                     "db" "sqlite" "mdb" "dump"
                     "pyc" "pyo" "pyd" "obj" "o" "a"
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

    # Проверка файлов по имени (теперь сравниваем с именем файла)
    for pattern in "${EXCLUDED_FILES[@]}"; do
        case "$filename" in
            $pattern)
                return 0
                ;;
        esac
    done

    # Проверка по расширению (теперь сравниваем с именем файла)
    for ext in "${EXCLUDED_EXTENSIONS[@]}"; do
        case "$filename" in
            *.$ext)
                return 0
                ;;
        esac
    done

    # Игнорируем скрытые файлы (начинающиеся с .)
    # Добавлена проверка, чтобы не исключать .env.* файлы, если они есть
    if [[ $filename == .* && ! $filename == .env.* ]]; then
        return 0
    fi

    return 1
}

# Основной цикл
find "$BACKEND_DIR" -type f | while read -r file; do
    if should_exclude "$file"; then
        continue # Пропускаем файл, если он должен быть исключен
    fi

    REL_PATH=${file#"$BACKEND_DIR/"}
    echo -e "\n\n=== $REL_PATH ===" >> "$OUTPUT_FILE"

    # Проверяем, является ли файл текстовым (оставляем исходную логику)
    if file -b --mime-encoding "$file" | grep -q 'binary'; then
        echo "[BINARY FILE CONTENT OMITTED]" >> "$OUTPUT_FILE"
    else
        cat "$file" >> "$OUTPUT_FILE"
    fi
done

# Финализация
mv "$OUTPUT_FILE" "$FINAL_OUTPUT"
echo "Backend code successfully exported to $FINAL_OUTPUT"