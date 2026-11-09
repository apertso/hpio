# 📱 Android App - Хочу Плачу

## 📋 Системные требования

### Для сборки APK файла:

- **Windows 10/11** (64-bit) с включенным Developer Mode
- **Node.js 18+** и npm
- **Visual Studio Build Tools 2022**
- **Rust** toolchain с MSVC
- **Android Studio** или Android SDK
- **Java JDK 21**

## 🔧 Пошаговая установка

### 1. Установка Visual Studio Build Tools

1. Скачайте [Visual Studio Build Tools 2022](https://aka.ms/vs/17/release/vs_BuildTools.exe)
2. Запустите установщик
3. Выберите **"C++ build tools"** workload
4. Убедитесь, что выбраны:
   - MSVC v143 - VS 2022 C++ x64/x86 build tools
   - Windows 11/10 SDK
5. Установите и перезагрузите компьютер

### 2. Установка Rust с MSVC toolchain

```bash
# Установите rustup (если еще не установлен)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Установите MSVC toolchain как основной
rustup default stable-x86_64-pc-windows-msvc

# Добавьте Android targets
rustup target add aarch64-linux-android armv7-linux-androideabi
```

### 3. Установка Java JDK

1. Перейдите на [официальный сайт Oracle](https://www.oracle.com/java/technologies/downloads/)
2. Выберите **Java 21** (LTS версии)
3. Скачайте **Windows x64 Installer** (.msi файл)
4. Запустите установщик с правами администратора
5. Следуйте инструкциям установщика (оставьте настройки по умолчанию)
6. После установки проверьте версию:

```bash
java -version
javac -version
```

### 4. Установка Android SDK и NDK

**Вариант A: Через Android Studio (рекомендуется)**

1. Скачайте [Android Studio](https://developer.android.com/studio)
2. Установите Android Studio
   Для Windows можно использовать Chocolatey:

```bash
choco install androidstudio -y
```

3. Откройте **Tools → SDK Manager**
4. Во вкладке **SDK Tools** установите:
   - **Android NDK (Side by side)** - выберите последнюю версию
   - **Android SDK Build-Tools**
   - **Android SDK Platform-Tools**

**Вариант B: Только SDK (без Android Studio)**

1. Скачайте [Command Line Tools](https://developer.android.com/studio#command-tools)
2. Создайте папку `C:\Android\android-sdk`
3. Распакуйте туда командные инструменты
4. Установите необходимые компоненты через `sdkmanager`

### 5. Настройка переменных окружения

Добавьте следующие переменные в системные переменные Windows:

| Переменная         | Значение                              |
| ------------------ | ------------------------------------- |
| `ANDROID_HOME`     | `C:\Android\android-sdk`              |
| `ANDROID_SDK_ROOT` | `C:\Android\android-sdk`              |
| `NDK_HOME`         | `C:\Android\android-sdk\ndk\[версия]` |

Добавьте в `PATH`:

- `%ANDROID_HOME%\platform-tools`
- `%ANDROID_HOME%\tools`
- `%NDK_HOME%`

### 6. Включение Developer Mode (Windows)

**Критически важно для сборки APK!**

1. Откройте **Параметры Windows** (Win + I)
2. Перейдите в **Обновление и безопасность** → **Для разработчиков** (Windows 10)
   или **Конфиденциальность и безопасность** → **Для разработчиков** (Windows 11)
3. **Включите режим разработчика**
4. Перезагрузите компьютер

### 7. Исправление PATH для Rust

Если у вас установлен Rust через Chocolatey, убедитесь, что rustup имеет приоритет:

```bash
# Проверьте, какой rustc используется
where rustc
rustup which rustc

# Если используется не rustup версия, временно исправьте PATH:
export PATH="/c/Users/[ваш_пользователь]/.cargo/bin:$PATH"
```

## 🔑 Настройка Firebase (Опционально)

Firebase требуется только для push-уведомлений. Без него приложение будет работать, но не сможет получать push-уведомления.

### Настройка google-services.json

1. **Скопируйте шаблон:**

   ```bash
   cd frontend/src-tauri/gen/android/app
   cp google-services.example.json google-services.json
   ```

2. **Получите настоящий файл:**
   - Обратитесь к мейнтейнеру проекта для получения актуального `google-services.json`
   - Или создайте новый проект в [Firebase Console](https://console.firebase.google.com/)
   - Замените скопированный файл на настоящий

## 🚀 Сборка APK

### 1. Подготовка проекта

```bash
cd frontend
npm install
```

### 2. Инициализация Android проекта

```bash
npx tauri android init --ci
```

### 3. Сборка APK

```bash
npm run android:build:release
```

### 4. Поиск готового APK

Сборка создаёт два APK:

```
frontend/src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release.apk
frontend/src-tauri/gen/android/app/build/outputs/apk/arm/release/app-arm-release.apk
```

## 🔧 Устранение проблем

### Проблема: "can't find crate for `std`"

**Причина:** Используется неправильная версия Rust (Chocolatey вместо rustup)

**Решение:**

```bash
# Убедитесь, что используете rustup версию
rustup default stable-x86_64-pc-windows-msvc
export PATH="/c/Users/[пользователь]/.cargo/bin:$PATH"
```

### Проблема: "Visual Studio Build Tools not found"

**Решение:** Установите Visual Studio Build Tools 2022 с C++ workload

### Проблема: "Creation symbolic link is not allowed"

**Решение:** Включите Developer Mode в Windows и перезагрузите компьютер

### Проблема: "Android SDK not found"

**Решение:**

1. Проверьте переменную `ANDROID_HOME`
2. Убедитесь, что SDK установлен
3. Перезапустите командную строку

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте все переменные окружения
2. Убедитесь, что Developer Mode включен
3. Проверьте, что используется правильный Rust toolchain:
   ```bash
   rustc --print sysroot
   # Должно показывать путь с rustup, а не chocolatey
   ```
4. Перезагрузите компьютер после установки всех компонентов
