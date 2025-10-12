use serde::{Deserialize, Serialize};

#[tauri::command]
pub fn get_fcm_token() -> Result<Option<String>, String> {
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

        // Get SharedPreferences
        let prefs_name = env.new_string("fcm_prefs")
            .map_err(|e| format!("Failed to create string: {:?}", e))?;

        let prefs = env.call_method(
            &context,
            "getSharedPreferences",
            "(Ljava/lang/String;I)Landroid/content/SharedPreferences;",
            &[JValue::Object(&prefs_name), JValue::Int(0)],
        )
        .map_err(|e| format!("Failed to get SharedPreferences: {:?}", e))?;

        let prefs_obj = prefs.l()
            .map_err(|e| format!("Failed to get prefs object: {:?}", e))?;

        // Get token from SharedPreferences
        let token_key = env.new_string("fcm_token")
            .map_err(|e| format!("Failed to create token key: {:?}", e))?;

        let default_value = env.new_string("")
            .map_err(|e| format!("Failed to create default value: {:?}", e))?;

        let token_result = env.call_method(
            &prefs_obj,
            "getString",
            "(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;",
            &[JValue::Object(&token_key), JValue::Object(&default_value)],
        )
        .map_err(|e| format!("Failed to get token: {:?}", e))?;

        let token_obj = token_result.l()
            .map_err(|e| format!("Failed to get token object: {:?}", e))?;

        let token_jstring = jni::objects::JString::from(token_obj);
        let token_str: String = env.get_string(&token_jstring)
            .map_err(|e| format!("Failed to get token string: {:?}", e))?
            .into();

        if token_str.is_empty() {
            Ok(None)
        } else {
            Ok(Some(token_str))
        }
    }

    #[cfg(not(target_os = "android"))]
    {
        Ok(None)
    }
}

#[tauri::command]
pub fn get_pending_navigation() -> Result<Option<String>, String> {
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

        let prefs_name = env.new_string("app_prefs")
            .map_err(|e| format!("Failed to create string: {:?}", e))?;

        let prefs = env.call_method(
            &context,
            "getSharedPreferences",
            "(Ljava/lang/String;I)Landroid/content/SharedPreferences;",
            &[JValue::Object(&prefs_name), JValue::Int(0)],
        )
        .map_err(|e| format!("Failed to get SharedPreferences: {:?}", e))?;

        let prefs_obj = prefs.l()
            .map_err(|e| format!("Failed to get prefs object: {:?}", e))?;

        let nav_key = env.new_string("pending_navigation")
            .map_err(|e| format!("Failed to create nav key: {:?}", e))?;

        let default_value = env.new_string("")
            .map_err(|e| format!("Failed to create default value: {:?}", e))?;

        let nav_result = env.call_method(
            &prefs_obj,
            "getString",
            "(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;",
            &[JValue::Object(&nav_key), JValue::Object(&default_value)],
        )
        .map_err(|e| format!("Failed to get navigation: {:?}", e))?;

        let nav_obj = nav_result.l()
            .map_err(|e| format!("Failed to get navigation object: {:?}", e))?;

        let nav_jstring = jni::objects::JString::from(nav_obj);
        let nav_str: String = env.get_string(&nav_jstring)
            .map_err(|e| format!("Failed to get navigation string: {:?}", e))?
            .into();

        if nav_str.is_empty() {
            Ok(None)
        } else {
            Ok(Some(nav_str))
        }
    }

    #[cfg(not(target_os = "android"))]
    {
        Ok(None)
    }
}

#[tauri::command]
pub fn clear_pending_navigation() -> Result<(), String> {
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

        let prefs_name = env.new_string("app_prefs")
            .map_err(|e| format!("Failed to create string: {:?}", e))?;

        let prefs = env.call_method(
            &context,
            "getSharedPreferences",
            "(Ljava/lang/String;I)Landroid/content/SharedPreferences;",
            &[JValue::Object(&prefs_name), JValue::Int(0)],
        )
        .map_err(|e| format!("Failed to get SharedPreferences: {:?}", e))?;

        let prefs_obj = prefs.l()
            .map_err(|e| format!("Failed to get prefs object: {:?}", e))?;

        let editor = env.call_method(
            &prefs_obj,
            "edit",
            "()Landroid/content/SharedPreferences$Editor;",
            &[],
        )
        .map_err(|e| format!("Failed to get editor: {:?}", e))?;

        let editor_obj = editor.l()
            .map_err(|e| format!("Failed to get editor object: {:?}", e))?;

        let nav_key = env.new_string("pending_navigation")
            .map_err(|e| format!("Failed to create nav key: {:?}", e))?;

        env.call_method(
            &editor_obj,
            "remove",
            "(Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;",
            &[JValue::Object(&nav_key)],
        )
        .map_err(|e| format!("Failed to remove key: {:?}", e))?;

        env.call_method(
            &editor_obj,
            "apply",
            "()V",
            &[],
        )
        .map_err(|e| format!("Failed to apply changes: {:?}", e))?;

        Ok(())
    }

    #[cfg(not(target_os = "android"))]
    {
        Ok(())
    }
}
