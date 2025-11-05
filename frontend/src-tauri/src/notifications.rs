use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PermissionStatus {
    pub granted: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PendingNotification {
    pub package_name: String,
    pub title: String,
    pub text: String,
    pub timestamp: i64,
}

#[tauri::command]
pub fn check_notification_permission() -> Result<PermissionStatus, String> {
    #[cfg(target_os = "android")]
    {
        use jni::objects::JValue;
        use jni::{AttachGuard, JavaVM};
        use std::os::raw::c_void;

        // Получаем JavaVM через ndk_context
        let ctx = ndk_context::android_context();
        let vm_ptr = ctx.vm() as *mut c_void;
        let vm = unsafe { JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM) }
            .map_err(|e| format!("Failed to get JavaVM: {:?}", e))?;

        let mut env: AttachGuard = vm.attach_current_thread()
            .map_err(|e| format!("Failed to attach thread: {:?}", e))?;

        let context = unsafe { jni::objects::JObject::from_raw(ctx.context() as *mut jni::sys::_jobject) };

        // Вызываем NotificationPermissionHelper.isNotificationListenerEnabled
        let helper_class = env.find_class("com/hochuplachu/hpio/NotificationPermissionHelper")
            .map_err(|e| format!("Failed to find helper class: {:?}", e))?;

        let is_enabled = env.call_static_method(
            helper_class,
            "isNotificationListenerEnabled",
            "(Landroid/content/Context;)Z",
            &[JValue::Object(&context)],
        )
        .map_err(|e| format!("Failed to call method: {:?}", e))?;

        let granted = is_enabled.z()
            .map_err(|e| format!("Failed to get boolean result: {:?}", e))?;

        Ok(PermissionStatus { granted })
    }

    #[cfg(not(target_os = "android"))]
    {
        // На других платформах всегда возвращаем false
        Ok(PermissionStatus { granted: false })
    }
}

#[tauri::command]
pub fn open_notification_settings() -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use jni::objects::JValue;
        use jni::{AttachGuard, JavaVM};
        use std::os::raw::c_void;

        // Получаем JavaVM через ndk_context
        let ctx = ndk_context::android_context();
        let vm_ptr = ctx.vm() as *mut c_void;
        let vm = unsafe { JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM) }
            .map_err(|e| format!("Failed to get JavaVM: {:?}", e))?;

        let mut env: AttachGuard = vm.attach_current_thread()
            .map_err(|e| format!("Failed to attach thread: {:?}", e))?;

        let context = unsafe { jni::objects::JObject::from_raw(ctx.context() as *mut jni::sys::_jobject) };

        // Вызываем NotificationPermissionHelper.openNotificationListenerSettings
        let helper_class = env.find_class("com/hochuplachu/hpio/NotificationPermissionHelper")
            .map_err(|e| format!("Failed to find helper class: {:?}", e))?;

        env.call_static_method(
            helper_class,
            "openNotificationListenerSettings",
            "(Landroid/content/Context;)V",
            &[JValue::Object(&context)],
        )
        .map_err(|e| format!("Failed to call method: {:?}", e))?;

        Ok(())
    }

    #[cfg(not(target_os = "android"))]
    {
        Err("This feature is only available on Android".to_string())
    }
}

#[tauri::command]
pub fn check_app_notification_permission() -> Result<PermissionStatus, String> {
    #[cfg(target_os = "android")]
    {
        use jni::objects::JValue;
        use jni::{AttachGuard, JavaVM};
        use std::os::raw::c_void;

        let ctx = ndk_context::android_context();
        let vm_ptr = ctx.vm() as *mut c_void;
        let vm = unsafe { JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM) }
            .map_err(|e| format!("Failed to get JavaVM: {:?}", e))?;

        let mut env: AttachGuard = vm.attach_current_thread()
            .map_err(|e| format!("Failed to attach thread: {:?}", e))?;

        let context = unsafe { jni::objects::JObject::from_raw(ctx.context() as *mut jni::sys::_jobject) };

        let helper_class = env.find_class("com/hochuplachu/hpio/NotificationPermissionHelper")
            .map_err(|e| format!("Failed to find helper class: {:?}", e))?;

        let is_granted = env.call_static_method(
            helper_class,
            "checkAppNotificationPermission",
            "(Landroid/content/Context;)Z",
            &[JValue::Object(&context)],
        )
        .map_err(|e| format!("Failed to call method: {:?}", e))?;

        let granted = is_granted.z()
            .map_err(|e| format!("Failed to get boolean result: {:?}", e))?;

        Ok(PermissionStatus { granted })
    }

    #[cfg(not(target_os = "android"))]
    {
        Ok(PermissionStatus { granted: false })
    }
}

#[tauri::command]
pub fn request_app_notification_permission() -> Result<PermissionStatus, String> {
    #[cfg(target_os = "android")]
    {
        use jni::objects::JValue;
        use jni::{AttachGuard, JavaVM};
        use std::os::raw::c_void;

        let ctx = ndk_context::android_context();
        let vm_ptr = ctx.vm() as *mut c_void;
        let vm = unsafe { JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM) }
            .map_err(|e| format!("Failed to get JavaVM: {:?}", e))?;

        let mut env: AttachGuard = vm.attach_current_thread()
            .map_err(|e| format!("Failed to attach thread: {:?}", e))?;

        let context = unsafe { jni::objects::JObject::from_raw(ctx.context() as *mut jni::sys::_jobject) };

        let helper_class = env.find_class("com/hochuplachu/hpio/NotificationPermissionHelper")
            .map_err(|e| format!("Failed to find helper class: {:?}", e))?;

        let already_granted = env.call_static_method(
            helper_class,
            "requestAppNotificationPermission",
            "(Landroid/app/Activity;)Z",
            &[JValue::Object(&context)],
        )
        .map_err(|e| format!("Failed to call method: {:?}", e))?;

        let granted = already_granted.z()
            .map_err(|e| format!("Failed to get boolean result: {:?}", e))?;

        Ok(PermissionStatus { granted })
    }

    #[cfg(not(target_os = "android"))]
    {
        Ok(PermissionStatus { granted: false })
    }
}

#[tauri::command]
pub fn open_app_notification_settings() -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use jni::objects::JValue;
        use jni::{AttachGuard, JavaVM};
        use std::os::raw::c_void;

        let ctx = ndk_context::android_context();
        let vm_ptr = ctx.vm() as *mut c_void;
        let vm = unsafe { JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM) }
            .map_err(|e| format!("Failed to get JavaVM: {:?}", e))?;

        let mut env: AttachGuard = vm.attach_current_thread()
            .map_err(|e| format!("Failed to attach thread: {:?}", e))?;

        let context = unsafe { jni::objects::JObject::from_raw(ctx.context() as *mut jni::sys::_jobject) };

        let helper_class = env.find_class("com/hochuplachu/hpio/NotificationPermissionHelper")
            .map_err(|e| format!("Failed to find helper class: {:?}", e))?;

        env.call_static_method(
            helper_class,
            "openAppNotificationSettings",
            "(Landroid/content/Context;)V",
            &[JValue::Object(&context)],
        )
        .map_err(|e| format!("Failed to call method: {:?}", e))?;

        Ok(())
    }

    #[cfg(not(target_os = "android"))]
    {
        Err("This feature is only available on Android".to_string())
    }
}

#[tauri::command]
pub fn get_pending_notifications() -> Result<Vec<PendingNotification>, String> {
    #[cfg(target_os = "android")]
    {
        use std::fs;
        use std::path::PathBuf;

        let ctx = ndk_context::android_context();
        let files_dir = unsafe {
            let context = jni::objects::JObject::from_raw(ctx.context() as *mut jni::sys::_jobject);
            let vm_ptr = ctx.vm() as *mut std::os::raw::c_void;
            let vm = jni::JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM)
                .map_err(|e| format!("Failed to get JavaVM: {:?}", e))?;
            let mut env = vm.attach_current_thread()
                .map_err(|e| format!("Failed to attach thread: {:?}", e))?;

            let files_dir_obj = env.call_method(
                &context,
                "getFilesDir",
                "()Ljava/io/File;",
                &[],
            )
            .map_err(|e| format!("Failed to get files dir: {:?}", e))?;

            let file_obj = files_dir_obj.l()
                .map_err(|e| format!("Failed to get file object: {:?}", e))?;

            let path_jstring = env.call_method(
                &file_obj,
                "getAbsolutePath",
                "()Ljava/lang/String;",
                &[],
            )
            .map_err(|e| format!("Failed to get absolute path: {:?}", e))?;

            let path_obj = path_jstring.l()
                .map_err(|e| format!("Failed to get path object: {:?}", e))?;
            let path_jstring = jni::objects::JString::from(path_obj);

            let path_str: String = env.get_string(&path_jstring)
                .map_err(|e| format!("Failed to get string: {:?}", e))?
                .into();

            path_str
        };

        let mut file_path = PathBuf::from(files_dir);
        file_path.push("pending_notifications.json");

        if !file_path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read notifications file: {:?}", e))?;

        if content.is_empty() {
            return Ok(Vec::new());
        }

        let json_array: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse JSON: {:?}", e))?;

        let mut notifications = Vec::new();
        if let Some(array) = json_array.as_array() {
            for item in array {
                if let (Some(package_name), Some(title), Some(text), Some(timestamp)) = (
                    item.get("packageName").and_then(|v| v.as_str()),
                    item.get("title").and_then(|v| v.as_str()),
                    item.get("text").and_then(|v| v.as_str()),
                    item.get("timestamp").and_then(|v| v.as_i64()),
                ) {
                    notifications.push(PendingNotification {
                        package_name: package_name.to_string(),
                        title: title.to_string(),
                        text: text.to_string(),
                        timestamp,
                    });
                }
            }
        }

        Ok(notifications)
    }

    #[cfg(not(target_os = "android"))]
    {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub fn clear_pending_notifications() -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use std::fs;
        use std::path::PathBuf;

        let ctx = ndk_context::android_context();
        let files_dir = unsafe {
            let context = jni::objects::JObject::from_raw(ctx.context() as *mut jni::sys::_jobject);
            let vm_ptr = ctx.vm() as *mut std::os::raw::c_void;
            let vm = jni::JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM)
                .map_err(|e| format!("Failed to get JavaVM: {:?}", e))?;
            let mut env = vm.attach_current_thread()
                .map_err(|e| format!("Failed to attach thread: {:?}", e))?;

            let files_dir_obj = env.call_method(
                &context,
                "getFilesDir",
                "()Ljava/io/File;",
                &[],
            )
            .map_err(|e| format!("Failed to get files dir: {:?}", e))?;

            let file_obj = files_dir_obj.l()
                .map_err(|e| format!("Failed to get file object: {:?}", e))?;

            let path_jstring = env.call_method(
                &file_obj,
                "getAbsolutePath",
                "()Ljava/lang/String;",
                &[],
            )
            .map_err(|e| format!("Failed to get absolute path: {:?}", e))?;

            let path_obj = path_jstring.l()
                .map_err(|e| format!("Failed to get path object: {:?}", e))?;
            let path_jstring = jni::objects::JString::from(path_obj);

            let path_str: String = env.get_string(&path_jstring)
                .map_err(|e| format!("Failed to get string: {:?}", e))?
                .into();

            path_str
        };

        let mut file_path = PathBuf::from(files_dir);
        file_path.push("pending_notifications.json");

        if file_path.exists() {
            fs::write(&file_path, "[]")
                .map_err(|e| format!("Failed to clear notifications file: {:?}", e))?;
        }

        Ok(())
    }

    #[cfg(not(target_os = "android"))]
    {
        Ok(())
    }
}

#[tauri::command]
pub fn check_battery_optimization_disabled() -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        use jni::objects::JValue;
        use jni::{AttachGuard, JavaVM};
        use std::os::raw::c_void;

        let ctx = ndk_context::android_context();
        let vm_ptr = ctx.vm() as *mut c_void;
        let vm = unsafe { JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM) }
            .map_err(|e| format!("Failed to get JavaVM: {:?}", e))?;

        let mut env: AttachGuard = vm.attach_current_thread()
            .map_err(|e| format!("Failed to attach thread: {:?}", e))?;

        let context = unsafe { jni::objects::JObject::from_raw(ctx.context() as *mut jni::sys::_jobject) };

        let helper_class = env.find_class("com/hochuplachu/hpio/NotificationPermissionHelper")
            .map_err(|e| format!("Failed to find helper class: {:?}", e))?;

        let is_disabled = env.call_static_method(
            helper_class,
            "isBatteryOptimizationDisabled",
            "(Landroid/content/Context;)Z",
            &[JValue::Object(&context)],
        )
        .map_err(|e| format!("Failed to call method: {:?}", e))?;

        let result = is_disabled.z()
            .map_err(|e| format!("Failed to get boolean result: {:?}", e))?;

        Ok(result)
    }

    #[cfg(not(target_os = "android"))]
    {
        Ok(false)
    }
}

#[tauri::command]
pub fn open_battery_optimization_settings() -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use jni::objects::JValue;
        use jni::{AttachGuard, JavaVM};
        use std::os::raw::c_void;

        let ctx = ndk_context::android_context();
        let vm_ptr = ctx.vm() as *mut c_void;
        let vm = unsafe { JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM) }
            .map_err(|e| format!("Failed to get JavaVM: {:?}", e))?;

        let mut env: AttachGuard = vm.attach_current_thread()
            .map_err(|e| format!("Failed to attach thread: {:?}", e))?;

        let context = unsafe { jni::objects::JObject::from_raw(ctx.context() as *mut jni::sys::_jobject) };

        let helper_class = env.find_class("com/hochuplachu/hpio/NotificationPermissionHelper")
            .map_err(|e| format!("Failed to find helper class: {:?}", e))?;

        env.call_static_method(
            helper_class,
            "openBatteryOptimizationSettings",
            "(Landroid/content/Context;)V",
            &[JValue::Object(&context)],
        )
        .map_err(|e| format!("Failed to call method: {:?}", e))?;

        Ok(())
    }

    #[cfg(not(target_os = "android"))]
    {
        Err("This feature is only available on Android".to_string())
    }
}
