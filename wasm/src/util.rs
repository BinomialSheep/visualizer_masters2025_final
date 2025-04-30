#![allow(non_snake_case, unused_macros)]
//! util.rs ― AHC「燃えるごみ回収最適化」用ライブラリ
//! * lib.rs 側のインターフェース（gen/parse_input/parse_output/vis/get_max_turn）は変更不可
//! * 依存クレートは README 指定バージョンに合わせること
//! * 乱数生成・入力生成ロジックは問題文を忠実に実装

use itertools::Itertools;
use proconio::input;
use rand::prelude::*;
use rand_chacha::ChaCha20Rng;
use rand_distr::Normal;
use std::collections::HashMap;
use svg::node::element::{Circle, Line, Style};
use svg::Document;

// -----------------------------------------------------------------------------
// ユーティリティ共通  (元 util.rs と同じ)
pub trait SetMinMax {
    fn setmin(&mut self, v: Self) -> bool;
    fn setmax(&mut self, v: Self) -> bool;
}
impl<T> SetMinMax for T
where
    T: PartialOrd,
{
    #[inline]
    fn setmin(&mut self, v: T) -> bool {
        *self > v && {
            *self = v;
            true
        }
    }
    #[inline]
    fn setmax(&mut self, v: T) -> bool {
        *self < v && {
            *self = v;
            true
        }
    }
}
#[macro_export]
macro_rules! mat {
    ($($e:expr),*) => { Vec::from(vec![$($e),*]) };
    ($($e:expr,)*) => { Vec::from(vec![$($e),*]) };
    ($e:expr; $d:expr) => { Vec::from(vec![$e; $d]) };
    ($e:expr; $d:expr $(; $ds:expr)+) => { Vec::from(vec![mat![$e $(; $ds)*]; $d]) };
}

// -----------------------------------------------------------------------------
// 問題固有型定義

/// ごみ種別
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GKind {
    Burn,
    NonBurn,
    Recycle,
}
/// 1 点情報
#[derive(Clone, Copy, Debug)]
pub struct Garbage {
    pub x: i32,
    pub y: i32,
    pub kind: GKind,
}

/// -------------------- Input --------------------
#[derive(Clone, Debug)]
pub struct Input {
    pub X: usize,
    pub Y: usize,
    pub Z: usize,
    pub garbage: Vec<Garbage>, // Burn→NonBurn→Recycle の順
}

impl std::fmt::Display for Input {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "{} {} {}", self.X, self.Y, self.Z)?;
        for g in &self.garbage {
            writeln!(f, "{} {}", g.x, g.y)?;
        }
        Ok(())
    }
}

/// 入力パース
pub fn parse_input(src: &str) -> Input {
    let mut f = proconio::source::once::OnceSource::from(src);
    input! {
        from &mut f,
        x_cnt: usize, y_cnt: usize, z_cnt: usize,
        coords: [(i32,i32); x_cnt + y_cnt + z_cnt],
    }
    // ごみリスト作成
    let mut garbage = Vec::with_capacity(x_cnt + y_cnt + z_cnt);
    for (idx, &(x, y)) in coords.iter().enumerate() {
        let kind = if idx < x_cnt {
            GKind::Burn
        } else if idx < x_cnt + y_cnt {
            GKind::NonBurn
        } else {
            GKind::Recycle
        };
        garbage.push(Garbage { x, y, kind });
    }
    Input {
        X: x_cnt,
        Y: y_cnt,
        Z: z_cnt,
        garbage,
    }
}

/// -------------------- Output --------------------

/// 1 操作 (高橋L,高橋R,青木L,青木R) の 4 点 x,y → 8 整数
#[derive(Clone, Debug)]
pub struct Step(pub [i32; 8]);

#[derive(Clone, Debug)]
pub struct Output {
    pub q: usize,
    pub init: [i32; 8],
    pub steps: Vec<Step>,
}

pub fn parse_output(src: &str) -> Output {
    let nums: Vec<i32> = src
        .split_whitespace()
        .map(|s| s.parse::<i32>().unwrap())
        .collect();

    assert!(
        nums.len() >= 8 && nums.len() % 8 == 0,
        "Output must have 8*k ints"
    );

    // 8 個ずつにまとめる
    let mut rows = nums.chunks_exact(8);

    // 先頭が初期配置
    let init_chunk = rows.next().unwrap();
    let init = [
        init_chunk[0],
        init_chunk[1],
        init_chunk[2],
        init_chunk[3],
        init_chunk[4],
        init_chunk[5],
        init_chunk[6],
        init_chunk[7],
    ];

    // 残りがステップ
    let steps = rows
        .map(|c| Step([c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7]]))
        .collect::<Vec<_>>();

    Output {
        q: steps.len(),
        init,
        steps,
    }
}

// -----------------------------------------------------------------------------
// 入力ジェネレータ  (問題文を忠実に実装)

/// 乱数ガウス
fn gauss(rng: &mut ChaCha20Rng, sigma: f64) -> f64 {
    let nd = Normal::new(0.0, sigma).unwrap();
    rng.sample(nd)
}

/// ごみを `cnt` 個生成するヘルパ
fn gen_category(
    rng: &mut ChaCha20Rng,
    cnt: usize,
    kind: GKind,
    need_quadrant: bool,
    existing: &mut Vec<Garbage>,
) -> Vec<Garbage> {
    loop {
        let n_cluster = rng.gen_range(5..=10);
        #[derive(Clone)]
        struct Cl {
            w: f64,
            cx: f64,
            cy: f64,
            sx: f64,
            sy: f64,
            th: f64,
        }
        let cls: Vec<Cl> = (0..n_cluster)
            .map(|_| Cl {
                w: rng.gen_range(0.0..1.0),
                cx: rng.gen_range(200_000..=800_000) as f64,
                cy: rng.gen_range(200_000..=800_000) as f64,
                sx: rng.gen_range(30_000..=90_000) as f64,
                sy: rng.gen_range(30_000..=90_000) as f64,
                th: rng.gen_range(0.0..std::f64::consts::PI),
            })
            .collect();
        let w_sum: f64 = cls.iter().map(|c| c.w).sum();
        let mut gen: Vec<Garbage> = Vec::with_capacity(cnt);
        while gen.len() < cnt {
            // クラスタ選択
            let mut r = rng.gen::<f64>() * w_sum;
            let mut idx = 0;
            while r >= cls[idx].w {
                r -= cls[idx].w;
                idx += 1;
            }
            let c = &cls[idx];
            let x_ = gauss(rng, c.sx);
            let y_ = gauss(rng, c.sy);
            let x = (c.cx + c.th.cos() * x_ - c.th.sin() * y_).round() as i32;
            let y = (c.cy + c.th.sin() * x_ + c.th.cos() * y_).round() as i32;
            if !(1..=999_999).contains(&x) || !(1..=999_999).contains(&y) {
                continue;
            }
            // 距離 1000 以上か
            let ok = existing
                .iter()
                .all(|g| ((g.x - x) as i64).pow(2) + ((g.y - y) as i64).pow(2) >= 1_000_i64.pow(2))
                && gen.iter().all(|g| {
                    ((g.x - x) as i64).pow(2) + ((g.y - y) as i64).pow(2) >= 1_000_i64.pow(2)
                });
            if !ok {
                continue;
            }
            gen.push(Garbage { x, y, kind });
        }
        if need_quadrant {
            let mut hit = [false; 4];
            for g in &gen {
                let q = match (
                    g.x <= 400_000,
                    g.y <= 400_000,
                    g.x >= 600_000,
                    g.y >= 600_000,
                ) {
                    (true, true, _, _) => 0,
                    (true, _, _, true) => 1,
                    (_, true, true, _) => 2,
                    (_, _, true, true) => 3,
                    _ => 4,
                };
                if q < 4 {
                    hit[q] = true;
                }
            }
            if !hit.iter().all(|&b| b) {
                continue; // 4 象限条件を満たすまでやり直し
            }
        }
        existing.extend(gen.clone());
        return gen;
    }
}

/// gen: seed から Input を生成
pub fn gen(seed: u64) -> Input {
    let mut rng = ChaCha20Rng::seed_from_u64(seed);
    const X: usize = 100;
    let ty = (seed % 3) as u8; // 0:A,1:B,2:C

    let (Y, Z) = match ty {
        0 => (0, rng.gen_range(10..=100)),
        1 => (100, 0),
        _ => (100, rng.gen_range(1..=100)),
    };

    let mut all: Vec<Garbage> = Vec::with_capacity(X + Y + Z);
    let mut g = Vec::new();
    g.extend(gen_category(&mut rng, X, GKind::Burn, true, &mut all));
    g.extend(gen_category(&mut rng, Y, GKind::NonBurn, false, &mut all));
    g.extend(gen_category(&mut rng, Z, GKind::Recycle, false, &mut all));

    Input {
        X,
        Y,
        Z,
        garbage: g,
    }
}

// -----------------------------------------------------------------------------
// スコア & SVG

#[inline]
fn area(a: (f64, f64), b: (f64, f64), c: (f64, f64)) -> f64 {
    (b.0 - a.0) * (c.1 - a.1) - (b.1 - a.1) * (c.0 - a.0)
}
#[inline]
fn inside(p: (f64, f64), a: (f64, f64), b: (f64, f64), c: (f64, f64)) -> bool {
    let ab = area(a, b, p);
    let bc = area(b, c, p);
    let ca = area(c, a, p);
    (ab >= 0.0 && bc >= 0.0 && ca >= 0.0) || (ab <= 0.0 && bc <= 0.0 && ca <= 0.0)
}

fn euclid(a: (i32, i32), b: (i32, i32)) -> f64 {
    let dx = (a.0 - b.0) as f64;
    let dy = (a.1 - b.1) as f64;
    (dx * dx + dy * dy).sqrt()
}

/// 三角形で回収
fn collect(
    p: (i32, i32),
    q: (i32, i32),
    r: (i32, i32),
    rem: &mut HashMap<(i32, i32), GKind>,
    target: GKind,
) {
    let pa = (p.0 as f64, p.1 as f64);
    let pb = (q.0 as f64, q.1 as f64);
    let pc = (r.0 as f64, r.1 as f64);
    let to_remove: Vec<_> = rem
        .iter()
        .filter(|(&coord, &kind)| {
            kind == target && inside((coord.0 as f64, coord.1 as f64), pa, pb, pc)
        })
        .map(|(&coord, _)| coord)
        .collect();
    for k in to_remove {
        rem.remove(&k);
    }
}

/// vis: スコア・エラーメッセージ・SVG
pub fn vis(input: &Input, output: &Output, turn: usize) -> (i64, String, String) {
    // -- シミュレーション
    let mut remaining: HashMap<(i32, i32), GKind> =
        input.garbage.iter().map(|g| ((g.x, g.y), g.kind)).collect();

    let mut poses = Vec::with_capacity(output.q + 1);
    poses.push(output.init);
    poses.extend(output.steps.iter().map(|s| s.0));

    let mut time_sum = 0f64;

    for t in 1..=turn.min(output.q) {
        let pre = poses[t - 1];
        let cur = poses[t];

        // 所要時間
        let d1 =
            euclid((pre[0], pre[1]), (cur[0], cur[1])) + euclid((pre[2], pre[3]), (cur[2], cur[3]));
        let d2 =
            euclid((pre[4], pre[5]), (cur[4], cur[5])) + euclid((pre[6], pre[7]), (cur[6], cur[7]));
        time_sum += d1.max(d2);

        // 高橋→青木の順で回収
        collect(
            (pre[0], pre[1]),
            (pre[2], pre[3]),
            (cur[0], cur[1]),
            &mut remaining,
            GKind::Burn,
        );
        collect(
            (cur[0], cur[1]),
            (pre[2], pre[3]),
            (cur[2], cur[3]),
            &mut remaining,
            GKind::Burn,
        );
        collect(
            (pre[4], pre[5]),
            (pre[6], pre[7]),
            (cur[4], cur[5]),
            &mut remaining,
            GKind::NonBurn,
        );
        collect(
            (cur[4], cur[5]),
            (pre[6], pre[7]),
            (cur[6], cur[7]),
            &mut remaining,
            GKind::NonBurn,
        );
    }

    // -- スコア & エラー
    let rem_burn = remaining.values().filter(|&&k| k == GKind::Burn).count();
    let rem_non = remaining.values().filter(|&&k| k == GKind::NonBurn).count();
    let mut err = String::new();
    if rem_burn + rem_non > 0 {
        err = format!("uncollected burn={} nonburn={}", rem_burn, rem_non);
    }
    let mut score = 0i64;
    if err.is_empty() && time_sum <= 1e8 {
        score = (1e6 * (1.0 + (time_sum / 1e8).log2())).round() as i64;
    }

    // -- SVG
    let W = 800f64;
    let H = 800f64;
    let scale = W / 1_000_000f64;
    let map = |p: (i32, i32)| -> (f64, f64) { ((p.0 as f64) * scale, H - (p.1 as f64) * scale) };
    let mut doc = Document::new()
        .set("id", "vis")
        .set("viewBox", (0, 0, W as i32, H as i32))
        .set("width", W)
        .set("height", H)
        .set("style", "background-color:white");
    doc = doc.add(Style::new(
        "text{font-size:8px;text-anchor:middle;dominant-baseline:central}",
    ));

    // ごみ描画
    for ((x, y), kind) in &remaining {
        let (sx, sy) = map((*x, *y));
        let col = match kind {
            GKind::Burn => "#FF0000",
            GKind::NonBurn => "#0000FF",
            GKind::Recycle => "#00AA00",
        };
        doc = doc.add(
            Circle::new()
                .set("cx", sx)
                .set("cy", sy)
                .set("r", 2)
                .set("fill", col),
        );
    }
    // 手先 (最終位置)
    let last = poses[turn.min(output.q)];
    let p1 = map((last[0], last[1]));
    let q1 = map((last[2], last[3]));
    let p2 = map((last[4], last[5]));
    let q2 = map((last[6], last[7]));
    doc = doc
        .add(
            Line::new()
                .set("x1", p1.0)
                .set("y1", p1.1)
                .set("x2", q1.0)
                .set("y2", q1.1)
                .set("stroke", "#880000"),
        )
        .add(
            Line::new()
                .set("x1", p2.0)
                .set("y1", p2.1)
                .set("x2", q2.0)
                .set("y2", q2.1)
                .set("stroke", "#000088"),
        );

    (score, err, doc.to_string())
}
