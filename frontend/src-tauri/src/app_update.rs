#[cfg(target_os = "android")]
fn call_helper(
    method: &str,
    signature: &str,
    url: Option<&str>,
) -> Result<String, String> {
    use jni::objects::{JObject, JValue};
    use jni::{AttachGuard, JavaVM};
    use std::os::raw::c_void;

    let ctx = ndk_context::android_context();
    let vm_ptr = ctx.vm() as *mut c_void;
    let vm = unsafe { JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM) }
        .map_err(|e| format!("Failed to get JavaVM: {:?}", e))?;
    let mut env: AttachGuard = vm
        .attach_current_thread()
        .map_err(|e| format!("Failed to attach thread: {:?}", e))?;
    let context = unsafe { JObject::from_raw(ctx.context() as *mut jni::sys::_jobject) };
    let url_arg = match url {
        Some(value) => Some(
            env.new_string(value)
                .map_err(|e| format!("Failed to create url string: {:?}", e))?,
        ),
        None => None,
    };
    let outcome = invoke_helper(&mut env, &context, method, signature, url_arg.as_ref());
    if outcome.is_err() {
        // Незакрытое Java-исключение при отсоединении потока роняет весь процесс,
        // поэтому сбрасываем его и возвращаем ошибку во фронтенд
        let _ = env.exception_clear();
    }
    outcome
}

#[cfg(target_os = "android")]
fn invoke_helper(
    env: &mut jni::JNIEnv,
    context: &jni::objects::JObject,
    method: &str,
    signature: &str,
    url_arg: Option<&jni::objects::JString>,
) -> Result<String, String> {
    use jni::objects::{JClass, JValue};

    // Команды async выполняются в фоновом потоке Rust: FindClass там видит только
    // системный загрузчик, поэтому класс приложения грузим через ClassLoader контекста
    let class_loader = env
        .call_method(context, "getClassLoader", "()Ljava/lang/ClassLoader;", &[])
        .and_then(|value| value.l())
        .map_err(|e| format!("Failed to get app ClassLoader: {:?}", e))?;
    let class_name = env
        .new_string("com.hochuplachu.hpio.AppUpdateHelper")
        .map_err(|e| format!("Failed to create class name string: {:?}", e))?;
    let class: JClass = env
        .call_method(
            &class_loader,
            "loadClass",
            "(Ljava/lang/String;)Ljava/lang/Class;",
            &[JValue::Object(&class_name)],
        )
        .and_then(|value| value.l())
        .map_err(|e| format!("Failed to load AppUpdateHelper: {:?}", e))?
        .into();

    let result = match url_arg {
        Some(value) => env.call_static_method(
            &class,
            method,
            signature,
            &[JValue::Object(context), JValue::Object(value)],
        ),
        None => env.call_static_method(&class, method, signature, &[]),
    }
    .map_err(|e| format!("Failed to call {}: {:?}", method, e))?;

    let result_obj = result
        .l()
        .map_err(|e| format!("Failed to read {} result: {:?}", method, e))?;
    let result_string = jni::objects::JString::from(result_obj);
    env.get_string(&result_string)
        .map(|value| value.into())
        .map_err(|e| format!("Failed to decode {} result: {:?}", method, e))
}

#[tauri::command(async)]
pub fn fetch_latest_github_release() -> Result<String, String> {
    #[cfg(target_os = "android")]
    {
        call_helper("fetchLatestRelease", "()Ljava/lang/String;", None)
    }
    #[cfg(not(target_os = "android"))]
    {
        Err("App updates are only available on Android".to_string())
    }
}

#[tauri::command(async)]
pub fn android_device_arch() -> Result<String, String> {
    #[cfg(target_os = "android")]
    {
        call_helper("deviceArch", "()Ljava/lang/String;", None)
    }
    #[cfg(not(target_os = "android"))]
    {
        Err("App updates are only available on Android".to_string())
    }
}

#[tauri::command(async)]
pub fn install_github_release_apk(url: String) -> Result<String, String> {
    #[cfg(target_os = "android")]
    {
        call_helper(
            "startInstall",
            "(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;",
            Some(&url),
        )
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = url;
        Err("App updates are only available on Android".to_string())
    }
}
