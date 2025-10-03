use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PermissionStatus {
    pub granted: bool,
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
