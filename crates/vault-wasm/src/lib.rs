use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn combine_shares(compact_json: &str) -> Result<String, JsValue> {
    let compact_strings: Vec<String> = serde_json::from_str(compact_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse shares array: {e}")))?;

    let shares: Vec<vault_core::types::SharePayload> = compact_strings
        .iter()
        .map(|s| vault_core::types::SharePayload::decode(s))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| JsValue::from_str(&format!("Failed to decode share: {e}")))?;

    let key_bytes = vault_core::shamir::combine_shares(&shares)
        .map_err(|e| JsValue::from_str(&format!("Failed to combine shares: {e}")))?;

    // Return hex string (what crypto.util.js:decryptVault expects as keyHex)
    let hex_key: String = key_bytes.iter().map(|b| format!("{b:02x}")).collect();
    Ok(hex_key)
}

#[wasm_bindgen]
pub fn validate_shares(compact_json: &str) -> JsValue {
    let compact_strings: Vec<String> = match serde_json::from_str(compact_json) {
        Ok(s) => s,
        Err(e) => {
            let obj = js_sys::Object::new();
            js_sys::Reflect::set(&obj, &"valid".into(), &false.into()).unwrap();
            js_sys::Reflect::set(&obj, &"error".into(), &e.to_string().into()).unwrap();
            return obj.into();
        }
    };

    let shares: Vec<vault_core::types::SharePayload> = match compact_strings
        .iter()
        .map(|s| vault_core::types::SharePayload::decode(s))
        .collect::<Result<Vec<_>, _>>()
    {
        Ok(s) => s,
        Err(e) => {
            let obj = js_sys::Object::new();
            js_sys::Reflect::set(&obj, &"valid".into(), &false.into()).unwrap();
            js_sys::Reflect::set(&obj, &"error".into(), &e.to_string().into()).unwrap();
            return obj.into();
        }
    };

    match vault_core::shamir::validate_share_set(&shares) {
        Ok(info) => {
            let obj = js_sys::Object::new();
            js_sys::Reflect::set(&obj, &"valid".into(), &info.ready.into()).unwrap();
            js_sys::Reflect::set(&obj, &"threshold".into(), &(info.threshold as u32).into())
                .unwrap();
            js_sys::Reflect::set(&obj, &"total".into(), &(info.total as u32).into()).unwrap();
            js_sys::Reflect::set(&obj, &"count".into(), &(info.count as u32).into()).unwrap();
            obj.into()
        }
        Err(e) => {
            let obj = js_sys::Object::new();
            js_sys::Reflect::set(&obj, &"valid".into(), &false.into()).unwrap();
            js_sys::Reflect::set(&obj, &"error".into(), &e.to_string().into()).unwrap();
            obj.into()
        }
    }
}

#[wasm_bindgen]
pub fn parse_share(raw: &str) -> JsValue {
    match vault_core::types::SharePayload::decode(raw) {
        Ok(share) => {
            let obj = js_sys::Object::new();
            js_sys::Reflect::set(&obj, &"v".into(), &(share.v as u32).into()).unwrap();
            js_sys::Reflect::set(&obj, &"i".into(), &(share.i as u32).into()).unwrap();
            js_sys::Reflect::set(&obj, &"t".into(), &(share.t as u32).into()).unwrap();
            js_sys::Reflect::set(&obj, &"n".into(), &(share.n as u32).into()).unwrap();
            js_sys::Reflect::set(&obj, &"compact".into(), &share.encode().into()).unwrap();
            obj.into()
        }
        Err(_) => JsValue::NULL,
    }
}
