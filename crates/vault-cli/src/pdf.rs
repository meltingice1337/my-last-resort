use anyhow::{Context, Result};
use printpdf::path::PaintMode;
use printpdf::{
    BuiltinFont, Color, ColorBits, ColorSpace, Image, ImageTransform, ImageXObject,
    IndirectFontRef, Mm, PdfDocument, PdfDocumentReference, PdfLayerIndex, PdfLayerReference,
    PdfPageIndex, Px, Rect, Rgb,
};

use crate::types::VaultConfig;
use vault_core::types::SharePayload;

// A5 dimensions in mm
const A5_W: f32 = 148.0;
const A5_H: f32 = 210.0;

// Colors
const PURPLE: (f32, f32, f32) = (0.35, 0.11, 0.53);
const RED: (f32, f32, f32) = (0.8, 0.1, 0.1);
const DARK_GRAY: (f32, f32, f32) = (0.2, 0.2, 0.2);
const GRAY: (f32, f32, f32) = (0.4, 0.4, 0.4);
const LIGHT_GRAY: (f32, f32, f32) = (0.7, 0.7, 0.7);

fn color(r: f32, g: f32, b: f32) -> Color {
    Color::Rgb(Rgb::new(r, g, b, None))
}

fn draw_text(
    layer: &PdfLayerReference,
    text: &str,
    x: f32,
    y: f32,
    font: &IndirectFontRef,
    size: f32,
    c: (f32, f32, f32),
) {
    layer.set_fill_color(color(c.0, c.1, c.2));
    layer.use_text(text, size, Mm(x), Mm(y), font);
}

fn draw_rect_stroke(layer: &PdfLayerReference, x: f32, y: f32, w: f32, h: f32, c: (f32, f32, f32)) {
    layer.set_outline_color(color(c.0, c.1, c.2));
    layer.set_outline_thickness(0.5);
    layer.add_rect(Rect::new(Mm(x), Mm(y), Mm(x + w), Mm(y + h)).with_mode(PaintMode::Stroke));
}

fn draw_rect_fill(
    layer: &PdfLayerReference,
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    fill: (f32, f32, f32),
    border: (f32, f32, f32),
) {
    layer.set_fill_color(color(fill.0, fill.1, fill.2));
    layer.set_outline_color(color(border.0, border.1, border.2));
    layer.set_outline_thickness(0.5);
    layer.add_rect(Rect::new(Mm(x), Mm(y), Mm(x + w), Mm(y + h)).with_mode(PaintMode::FillStroke));
}

fn wrap_text(text: &str, max_chars: usize) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut lines = Vec::new();
    let mut current = String::new();
    for word in words {
        let test = if current.is_empty() {
            word.to_string()
        } else {
            format!("{current} {word}")
        };
        if test.len() > max_chars && !current.is_empty() {
            lines.push(current);
            current = word.to_string();
        } else {
            current = test;
        }
    }
    if !current.is_empty() {
        lines.push(current);
    }
    lines
}

pub fn generate_share_pdf(
    share: &SharePayload,
    config: &VaultConfig,
    output_path: &str,
) -> Result<()> {
    let (doc, page1, layer1) =
        PdfDocument::new("Emergency Vault Share", Mm(A5_W), Mm(A5_H), "Layer 1");

    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;
    let font_mono = doc.add_builtin_font(BuiltinFont::Courier)?;

    let share_compact = share.encode();

    // Page 1: Share Card
    draw_share_card(
        &doc, page1, layer1, share, &share_compact,
        &font, &font_bold, &font_mono,
    )?;

    // Page 2: Recovery Instructions
    let (page2, layer2) = doc.add_page(Mm(A5_W), Mm(A5_H), "Layer 1");
    draw_instructions(&doc, page2, layer2, share, config, &font, &font_bold)?;

    // Page 3: Manual Recovery
    let (page3, layer3) = doc.add_page(Mm(A5_W), Mm(A5_H), "Layer 1");
    draw_manual_recovery(&doc, page3, layer3, config, &font, &font_bold, &font_mono)?;

    let pdf_bytes = doc.save_to_bytes()?;
    std::fs::write(output_path, pdf_bytes).context("Failed to write PDF")?;
    Ok(())
}

fn draw_share_card(
    doc: &PdfDocumentReference,
    page_idx: PdfPageIndex,
    layer_idx: PdfLayerIndex,
    share: &SharePayload,
    share_compact: &str,
    font: &IndirectFontRef,
    font_bold: &IndirectFontRef,
    font_mono: &IndirectFontRef,
) -> Result<()> {
    let layer = doc.get_page(page_idx).get_layer(layer_idx);

    // Y coordinates: printpdf uses bottom-left origin, top of A5 = 210mm
    let mut y = A5_H - 14.0;

    // Title
    draw_text(&layer, "EMERGENCY VAULT", 10.0, y, font_bold, 18.0, PURPLE);
    y -= 7.0;
    draw_text(
        &layer,
        &format!("SHARE #{} of {}", share.i, share.n),
        10.0, y, font_bold, 14.0, DARK_GRAY,
    );
    y -= 9.0;

    // Confidential warning box
    let box_h = 14.0;
    draw_rect_fill(&layer, 8.0, y - box_h, A5_W - 16.0, box_h, (1.0, 0.95, 0.95), RED);
    draw_text(&layer, "CONFIDENTIAL — DO NOT SHARE THIS DOCUMENT", 11.0, y - 5.0, font_bold, 9.0, RED);
    draw_text(&layer, "Store securely. This is one piece of an emergency recovery system.", 11.0, y - 10.0, font, 7.0, GRAY);
    y -= box_h + 7.0;

    // QR Code — compact string is much shorter than JSON, yields smaller QR
    let code = qrcode::QrCode::with_error_correction_level(share_compact, qrcode::EcLevel::M)
        .map_err(|e| anyhow::anyhow!("QR generation failed: {e}"))?;
    let qr_img: ::image::GrayImage = code.render::<::image::Luma<u8>>().quiet_zone(true).build();
    let (pw, ph) = (qr_img.width(), qr_img.height());

    let image_xobject = ImageXObject {
        width: Px(pw as usize),
        height: Px(ph as usize),
        color_space: ColorSpace::Greyscale,
        bits_per_component: ColorBits::Bit8,
        interpolate: false,
        image_data: qr_img.into_raw(),
        image_filter: None,
        smask: None,
        clipping_bbox: None,
    };

    let qr_size_mm = 60.0;
    let qr_x = (A5_W - qr_size_mm) / 2.0;
    let pdf_image = Image::from(image_xobject);
    pdf_image.add_to_layer(
        layer.clone(),
        ImageTransform {
            translate_x: Some(Mm(qr_x)),
            translate_y: Some(Mm(y - qr_size_mm)),
            dpi: Some(pw as f32 / (qr_size_mm / 25.4)),
            ..Default::default()
        },
    );
    y -= qr_size_mm + 4.0;

    // Caption
    draw_text(&layer, "Scan this QR code at the recovery website", 25.0, y, font, 8.0, GRAY);
    y -= 8.0;

    // Plain text fallback — compact string fits on one line
    draw_text(&layer, "PLAIN TEXT FALLBACK:", 10.0, y, font_bold, 8.0, DARK_GRAY);
    y -= 4.0;

    let box_height = 7.0;
    draw_rect_stroke(&layer, 8.0, y - box_height, A5_W - 16.0, box_height, LIGHT_GRAY);
    y -= 4.5;
    draw_text(&layer, share_compact, 10.0, y, font_mono, 7.0, DARK_GRAY);
    y -= 5.0;

    // Metadata
    let date = chrono::Local::now().format("%Y-%m-%d").to_string();
    draw_text(
        &layer,
        &format!("Share {} of {}  |  Threshold: {}  |  {}", share.i, share.n, share.t, date),
        10.0, y, font, 7.0, LIGHT_GRAY,
    );

    // Footer
    draw_text(&layer, "Emergency Vault — Recovery Share", 10.0, 5.0, font, 7.0, LIGHT_GRAY);
    draw_text(&layer, "Page 1 of 3", A5_W - 28.0, 5.0, font, 7.0, LIGHT_GRAY);

    Ok(())
}

fn draw_instructions(
    doc: &PdfDocumentReference,
    page_idx: PdfPageIndex,
    layer_idx: PdfLayerIndex,
    share: &SharePayload,
    config: &VaultConfig,
    font: &IndirectFontRef,
    font_bold: &IndirectFontRef,
) -> Result<()> {
    let layer = doc.get_page(page_idx).get_layer(layer_idx);
    let mut y = A5_H - 14.0;

    draw_text(&layer, "RECOVERY INSTRUCTIONS", 10.0, y, font_bold, 16.0, PURPLE);
    y -= 10.0;

    let steps = [
        ("Step 1: Gather shares", format!(
            "You need at least {} of {} share holders to recover the secret. Contact the other holders and coordinate.",
            share.t, share.n
        )),
        ("Step 2: Access the recovery tool", if config.repo_url.is_empty() {
            "Access the Emergency Vault recovery website.".to_string()
        } else {
            format!("Go to: {}", config.repo_url)
        }),
        ("Step 3: Scan or paste each share",
            "Each holder scans their QR code or pastes the vault:... string from their share card. The order does not matter.".to_string()
        ),
        ("Step 4: Decrypt", format!(
            "Once {} shares are entered, click \"Decrypt\" to recover the secret. The tool will fetch the encrypted vault and decrypt it using the reconstructed key.",
            share.t
        )),
    ];

    for (title, body) in &steps {
        draw_text(&layer, title, 10.0, y, font_bold, 11.0, DARK_GRAY);
        y -= 5.0;
        for line in wrap_text(body, 65) {
            draw_text(&layer, &line, 14.0, y, font, 9.0, GRAY);
            y -= 4.5;
        }
        y -= 3.0;
    }

    y -= 3.0;

    // Security reminders box
    let sec_h = 18.0;
    draw_rect_stroke(&layer, 8.0, y - sec_h, A5_W - 16.0, sec_h, RED);
    draw_text(&layer, "SECURITY REMINDERS", 11.0, y - 4.0, font_bold, 9.0, RED);
    draw_text(&layer, "- Never photograph or digitize this document", 11.0, y - 8.5, font, 8.0, GRAY);
    draw_text(&layer, "- Destroy after use if the vault owner instructs you to", 11.0, y - 12.5, font, 8.0, GRAY);
    draw_text(&layer, "- A single share alone cannot recover anything", 11.0, y - 16.5, font, 8.0, GRAY);

    // Footer
    draw_text(&layer, "Emergency Vault — Recovery Instructions", 10.0, 5.0, font, 7.0, LIGHT_GRAY);
    draw_text(&layer, "Page 2 of 3", A5_W - 28.0, 5.0, font, 7.0, LIGHT_GRAY);

    Ok(())
}

fn draw_manual_recovery(
    doc: &PdfDocumentReference,
    page_idx: PdfPageIndex,
    layer_idx: PdfLayerIndex,
    config: &VaultConfig,
    font: &IndirectFontRef,
    font_bold: &IndirectFontRef,
    font_mono: &IndirectFontRef,
) -> Result<()> {
    let layer = doc.get_page(page_idx).get_layer(layer_idx);
    let mut y = A5_H - 14.0;

    draw_text(&layer, "MANUAL RECOVERY (LAST RESORT)", 10.0, y, font_bold, 14.0, PURPLE);
    y -= 7.0;
    draw_text(&layer, "If the recovery website is unavailable, use this browser console script.", 10.0, y, font, 9.0, GRAY);
    y -= 8.0;

    draw_text(&layer, "Prerequisites:", 10.0, y, font_bold, 10.0, DARK_GRAY);
    y -= 5.0;
    for prereq in [
        "- A modern web browser (Chrome, Firefox, Safari, Edge)",
        "- Access to vault.json (or its contents)",
        &format!("- At least {} share strings (vault:...)", config.threshold),
    ] {
        draw_text(&layer, prereq, 14.0, y, font, 8.0, GRAY);
        y -= 4.0;
    }
    y -= 3.0;

    draw_text(&layer, "Instructions:", 10.0, y, font_bold, 10.0, DARK_GRAY);
    y -= 5.0;
    for instr in [
        "1. Open browser DevTools (F12) and go to Console tab",
        "2. Copy and paste the script below, then press Enter",
        "3. Follow the on-screen prompts",
    ] {
        draw_text(&layer, instr, 14.0, y, font, 8.0, GRAY);
        y -= 4.0;
    }
    y -= 4.0;

    let script_lines = vec![
        "(async()=>{".to_string(),
        format!("  const WASM='{}/assets/vault_wasm_bg.wasm';", config.repo_url),
        format!("  const JS='{}/assets/vault_wasm.js';", config.repo_url),
        "  const mod=await import(JS);".to_string(),
        "  await mod.default(WASM);".to_string(),
        "  window.recover=async function(shares,vaultUrl){".to_string(),
        "    // shares = ['vault:...','vault:...',...]".to_string(),
        "    const json=JSON.stringify(shares);".to_string(),
        "    const keyHex=mod.combine_shares(json);".to_string(),
        "    const vault=await(await fetch(vaultUrl)).json();".to_string(),
        "    const key=new Uint8Array(".to_string(),
        "      keyHex.match(/.{2}/g).map(b=>parseInt(b,16)));".to_string(),
        "    const iv=Uint8Array.from(atob(vault.iv),".to_string(),
        "      c=>c.charCodeAt(0));".to_string(),
        "    const ct=Uint8Array.from(atob(vault.ciphertext),".to_string(),
        "      c=>c.charCodeAt(0));".to_string(),
        "    const ck=await crypto.subtle.importKey(".to_string(),
        "      'raw',key,{name:'AES-GCM'},false,['decrypt']);".to_string(),
        "    const pt=await crypto.subtle.decrypt(".to_string(),
        "      {name:'AES-GCM',iv},ck,ct);".to_string(),
        "    const text=new TextDecoder().decode(pt);".to_string(),
        "    console.log('SECRET:',text);return text;".to_string(),
        "  };".to_string(),
        "  console.log('Ready! Use:');".to_string(),
        "  console.log('recover([\"vault:...\"],\"<URL>\")');".to_string(),
        "})();".to_string(),
    ];

    let box_height = script_lines.len() as f32 * 3.2 + 4.0;
    draw_rect_fill(
        &layer, 8.0, y - box_height, A5_W - 16.0, box_height,
        (0.95, 0.95, 0.97), LIGHT_GRAY,
    );

    for line in &script_lines {
        y -= 3.2;
        draw_text(&layer, line, 10.0, y, font_mono, 6.5, DARK_GRAY);
    }
    y -= 7.0;

    if !config.repo_url.is_empty() {
        draw_text(
            &layer,
            &format!("Vault URL: {}/vault.json", config.repo_url),
            10.0, y, font, 8.0, GRAY,
        );
        y -= 5.0;
    }

    let warn_h = 10.0;
    draw_rect_stroke(&layer, 8.0, y - warn_h, A5_W - 16.0, warn_h, RED);
    draw_text(
        &layer,
        "After recovery, close all browser tabs and clear console history.",
        11.0, y - 6.5, font_bold, 8.0, RED,
    );

    // Footer
    draw_text(&layer, "Emergency Vault — Manual Recovery Script", 10.0, 5.0, font, 7.0, LIGHT_GRAY);
    draw_text(&layer, "Page 3 of 3", A5_W - 28.0, 5.0, font, 7.0, LIGHT_GRAY);

    Ok(())
}
