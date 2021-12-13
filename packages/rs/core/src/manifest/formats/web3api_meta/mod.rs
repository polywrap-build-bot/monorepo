pub mod deserialize;
pub mod migrate;
pub mod prealpha_001_1;
pub mod validate;
use serde::{Deserialize, Serialize};

pub use migrate::migrate_meta_manifest;
pub use prealpha_001_1::MetaManifest as MetaManifest001Prealpha1;
pub use validate::validate_web3_api_manifest;

pub type MetaManifest = MetaManifest001Prealpha1;

pub const LATEST_META_MANIFEST_FORMAT: &'static str = MetaManifestFormats::PREALPHA_001_1;

#[non_exhaustive]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct MetaManifestFormats;

impl MetaManifestFormats {
    pub const PREALPHA_001_1: &'static str = "0.0.1-prealpha.1";

    pub fn get_format_name(input: &str) -> Option<&str> {
        let format = match input {
            MetaManifestFormats::PREALPHA_001_1 => MetaManifestFormats::PREALPHA_001_1,
            _ => "",
        };
        if format.is_empty() {
            return None;
        }
        Some(format)
    }
}

#[derive(Debug, Clone)]
pub enum AnyMetaManifest {
    MetaManifest001Prealpha1(MetaManifest001Prealpha1),
}

impl AnyMetaManifest {
    pub fn get_manifest_format(manifest: &Self) -> &String {
        match manifest {
            AnyMetaManifest::MetaManifest001Prealpha1(one) => &one.format,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Links {
    pub name: String,
    pub icon: Option<String>,
    pub url: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Queries {
    pub name: String,
    pub description: Option<String>,
    pub query: String,
    pub vars: Option<String>,
}
