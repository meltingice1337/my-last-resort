use anyhow::{Context, Result};
use printpdf::path::PaintMode;
use printpdf::{
    BuiltinFont, Color, ColorBits, ColorSpace, Image, ImageTransform, ImageXObject,
    IndirectFontRef, Mm, PdfDocument, PdfLayerReference, Px, Rect, Rgb,
};

use crate::types::VaultConfig;
use vault_core::types::SharePayload;

// A4 landscape = two A5 portrait halves side by side
const A4_W: f32 = 297.0;
const A4_H: f32 = 210.0;
const HALF_W: f32 = A4_W / 2.0; // 148.5mm ≈ A5 width

// Margins within each A5 half
const MARGIN: f32 = 10.0;
const CARD_W: f32 = HALF_W - 2.0 * MARGIN;

// Colors — optimized for B&W printing
const BLACK: (f32, f32, f32) = (0.0, 0.0, 0.0);
const SOFT: (f32, f32, f32) = (0.35, 0.35, 0.35); // only for footers/metadata
const BORDER: (f32, f32, f32) = (0.6, 0.6, 0.6); // boxes, cut line, separators

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
    let (doc, page, layer_idx) =
        PdfDocument::new("Emergency Vault Share", Mm(A4_W), Mm(A4_H), "Layer 1");

    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;
    let font_mono = doc.add_builtin_font(BuiltinFont::CourierBold)?;

    let layer = doc.get_page(page).get_layer(layer_idx);
    let share_compact = share.encode();

    // Dashed cut line down the middle
    layer.set_outline_color(color(BORDER.0, BORDER.1, BORDER.2));
    layer.set_outline_thickness(0.3);
    // Draw small dashes manually (printpdf doesn't support dash patterns easily)
    let dash_len = 3.0;
    let gap_len = 3.0;
    let mut dy = 5.0;
    while dy < A4_H - 5.0 {
        let end = (dy + dash_len).min(A4_H - 5.0);
        layer.add_rect(
            Rect::new(Mm(HALF_W - 0.05), Mm(dy), Mm(HALF_W + 0.05), Mm(end))
                .with_mode(PaintMode::FillStroke),
        );
        dy += dash_len + gap_len;
    }

    // Scissor icon hint at top of cut line
    draw_text(
        &layer,
        "- - -",
        HALF_W - 4.0,
        A4_H - 4.0,
        &font,
        6.0,
        BORDER,
    );

    // Left half: Share Card (x offset = 0)
    draw_share_card(
        &layer,
        0.0,
        share,
        &share_compact,
        &font,
        &font_bold,
        &font_mono,
    )?;

    // Right half: Recovery Page (x offset = HALF_W)
    draw_recovery_page(&layer, HALF_W, share, config, &font, &font_bold, &font_mono)?;

    let pdf_bytes = doc.save_to_bytes()?;
    std::fs::write(output_path, pdf_bytes).context("Failed to write PDF")?;
    Ok(())
}

fn draw_share_card(
    layer: &PdfLayerReference,
    x_off: f32,
    share: &SharePayload,
    share_compact: &str,
    font: &IndirectFontRef,
    font_bold: &IndirectFontRef,
    font_mono: &IndirectFontRef,
) -> Result<()> {
    let l = x_off + MARGIN; // left edge of content
    let mut y = A4_H - MARGIN;

    // Title
    draw_text(layer, "EMERGENCY VAULT", l, y, font_bold, 16.0, BLACK);
    y -= 6.0;
    draw_text(
        layer,
        &format!("SHARE #{} of {}", share.i, share.n),
        l,
        y,
        font_bold,
        12.0,
        BLACK,
    );
    y -= 8.0;

    // Confidential warning box
    let box_h = 12.0;
    draw_rect_fill(layer, l, y - box_h, CARD_W, box_h, (0.93, 0.93, 0.93), BORDER);
    draw_text(
        layer,
        "CONFIDENTIAL — DO NOT SHARE THIS DOCUMENT",
        l + 2.0,
        y - 4.5,
        font_bold,
        7.5,
        BLACK,
    );
    draw_text(
        layer,
        "Store securely. This is one piece of an emergency recovery system.",
        l + 2.0,
        y - 9.0,
        font,
        7.0,
        BLACK,
    );
    y -= box_h + 5.0;

    // QR Code (centered in left half)
    let code = qrcode::QrCode::with_error_correction_level(share_compact, qrcode::EcLevel::H)
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

    let qr_size_mm = 55.0;
    let qr_x = x_off + (HALF_W - qr_size_mm) / 2.0;
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
    y -= qr_size_mm + 3.0;

    // Caption
    draw_text(
        layer,
        "Scan this QR code at the recovery website",
        l + 8.0,
        y,
        font,
        8.0,
        BLACK,
    );
    y -= 7.0;

    // Plain text fallback — black bold mono, single line
    draw_text(
        layer,
        "PLAIN TEXT FALLBACK:",
        l,
        y,
        font_bold,
        8.0,
        BLACK,
    );
    y -= 4.5;
    let fb_h = 8.0;
    draw_rect_fill(
        layer,
        l,
        y - fb_h,
        CARD_W,
        fb_h,
        (0.95, 0.95, 0.95),
        BORDER,
    );
    draw_text(
        layer,
        share_compact,
        l + 2.0,
        y - 5.5,
        font_mono,
        7.5,
        (0.0, 0.0, 0.0),
    );
    y -= fb_h + 3.0;

    // Metadata
    let date = chrono::Local::now().format("%Y-%m-%d").to_string();
    draw_text(
        layer,
        &format!(
            "Share {} of {}  |  Threshold: {}  |  {}",
            share.i, share.n, share.t, date
        ),
        l,
        y,
        font,
        6.5,
        SOFT,
    );

    // Footer
    draw_text(
        layer,
        "Emergency Vault — Recovery Share",
        l,
        6.0,
        font,
        6.0,
        SOFT,
    );
    draw_text(
        layer,
        "Card 1 of 2",
        x_off + HALF_W - MARGIN - 17.0,
        6.0,
        font,
        6.0,
        SOFT,
    );

    Ok(())
}

fn draw_recovery_page(
    layer: &PdfLayerReference,
    x_off: f32,
    share: &SharePayload,
    config: &VaultConfig,
    font: &IndirectFontRef,
    font_bold: &IndirectFontRef,
    font_mono: &IndirectFontRef,
) -> Result<()> {
    let l = x_off + MARGIN;
    let mut y = A4_H - MARGIN;

    // === RECOVERY INSTRUCTIONS ===
    draw_text(
        layer,
        "RECOVERY INSTRUCTIONS",
        l,
        y,
        font_bold,
        11.0,
        BLACK,
    );
    y -= 7.0;

    let steps = [
        ("1. Gather shares", format!(
            "You need at least {} of {} holders. Contact them and coordinate.",
            share.t, share.n
        )),
        ("2. Access recovery tool", if config.repo_url.is_empty() {
            "Access the Emergency Vault recovery website.".to_string()
        } else {
            format!("Go to: {}", config.repo_url)
        }),
        ("3. Scan or paste shares",
            "Each holder scans their QR code or pastes the vault:... string. Order does not matter.".to_string()
        ),
        ("4. Decrypt", format!(
            "Once {} shares are entered, click \"Decrypt\" to recover the secret.",
            share.t
        )),
    ];

    for (title, body) in &steps {
        draw_text(layer, title, l, y, font_bold, 8.5, BLACK);
        y -= 4.0;
        for line in wrap_text(body, 55) {
            draw_text(layer, &line, l + 3.0, y, font, 7.5, BLACK);
            y -= 3.5;
        }
        y -= 1.5;
    }

    // Security
    y -= 0.5;
    draw_text(layer, "SECURITY:", l, y, font_bold, 7.5, BLACK);
    draw_text(
        layer,
        "Never photograph this. Destroy after use if instructed.",
        l + 18.0,
        y,
        font,
        7.0,
        BLACK,
    );
    y -= 4.0;

    // Separator
    layer.set_outline_color(color(BORDER.0, BORDER.1, BORDER.2));
    layer.set_outline_thickness(0.3);
    layer.add_rect(
        Rect::new(Mm(l), Mm(y), Mm(x_off + HALF_W - MARGIN), Mm(y + 0.1))
            .with_mode(PaintMode::Stroke),
    );
    y -= 4.0;

    // === MANUAL RECOVERY ===
    draw_text(
        layer,
        "MANUAL RECOVERY (LAST RESORT)",
        l,
        y,
        font_bold,
        9.0,
        BLACK,
    );
    y -= 4.5;
    draw_text(
        layer,
        "If the website is unavailable, use this browser console script.",
        l,
        y,
        font,
        7.0,
        BLACK,
    );
    y -= 4.0;

    draw_text(layer, "Prerequisites:", l, y, font_bold, 7.0, BLACK);
    draw_text(
        layer,
        &format!("Browser, vault.json, {} share strings", config.threshold),
        l + 23.0,
        y,
        font,
        7.0,
        BLACK,
    );
    y -= 3.5;
    draw_text(layer, "Steps:", l, y, font_bold, 7.0, BLACK);
    draw_text(
        layer,
        "F12 > Console > Paste script > Enter",
        l + 12.0,
        y,
        font,
        7.0,
        BLACK,
    );
    y -= 4.0;

    // Recovery script
    let script_lines = vec![
        "(async()=>{".to_string(),
        format!(
            "  const WASM='{}/assets/vault_wasm_bg.wasm';",
            config.repo_url
        ),
        format!("  const JS='{}/assets/vault_wasm.js';", config.repo_url),
        "  const mod=await import(JS); await mod.default(WASM);".to_string(),
        "  window.recover=async function(shares,vaultUrl){".to_string(),
        "    const keyHex=mod.combine_shares(JSON.stringify(shares));".to_string(),
        "    const vault=await(await fetch(vaultUrl)).json();".to_string(),
        "    const hex=s=>new Uint8Array(s.match(/.{2}/g).map(b=>parseInt(b,16)));".to_string(),
        "    const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));".to_string(),
        "    const ck=await crypto.subtle.importKey(".to_string(),
        "      'raw',hex(keyHex),{name:'AES-GCM'},false,['decrypt']);".to_string(),
        "    const pt=await crypto.subtle.decrypt(".to_string(),
        "      {name:'AES-GCM',iv:b64(vault.iv)},ck,b64(vault.ciphertext));".to_string(),
        "    const text=new TextDecoder().decode(pt);".to_string(),
        "    console.log('RECOVERED:',text); return text;".to_string(),
        "  };".to_string(),
        "  console.log('Ready! recover([\"vault:...\"],\"url\")');".to_string(),
        "})();".to_string(),
    ];

    let line_h = 3.5;
    let box_h = script_lines.len() as f32 * line_h + 3.0;
    draw_rect_fill(
        layer,
        l,
        y - box_h,
        CARD_W,
        box_h,
        (0.93, 0.93, 0.93),
        BORDER,
    );

    for line in &script_lines {
        y -= line_h;
        draw_text(layer, line, l + 1.5, y, font_mono, 8.0, (0.0, 0.0, 0.0));
    }
    y -= 4.5;

    if !config.repo_url.is_empty() {
        draw_text(
            layer,
            &format!("Vault: {}/vault.json", config.repo_url),
            l,
            y,
            font,
            7.0,
            BLACK,
        );
        y -= 4.0;
    }

    // Warning
    let warn_h = 7.0;
    draw_rect_stroke(layer, l, y - warn_h, CARD_W, warn_h, BORDER);
    draw_text(
        layer,
        "After recovery, close all tabs and clear console history.",
        l + 2.0,
        y - 4.5,
        font_bold,
        7.0,
        BLACK,
    );

    // Footer
    draw_text(
        layer,
        "Emergency Vault — Recovery & Manual Instructions",
        l,
        6.0,
        font,
        6.0,
        SOFT,
    );
    draw_text(
        layer,
        "Card 2 of 2",
        x_off + HALF_W - MARGIN - 17.0,
        6.0,
        font,
        6.0,
        SOFT,
    );

    Ok(())
}
