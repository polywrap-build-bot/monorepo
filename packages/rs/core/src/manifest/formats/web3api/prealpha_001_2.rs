#[derive(Clone, Debug)]
pub struct Web3ApiManifest {
    pub format: String,
    pub repository: Option<String>,
    pub build: Option<String>,
    pub language: String,
    pub modules: Modules,
    pub import_redirects: Option<Vec<ImportRedirects>>,
    pub __type: String,
}

impl Default for Web3ApiManifest {
    fn default() -> Web3ApiManifest {
        Web3ApiManifest {
            format: "0.0.1-prealpha.2".to_string(),
            repository: None,
            build: None,
            language: "".to_string(),
            modules: Modules::default(),
            import_redirects: None,
            __type: "Web3ApiManifest".to_string(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct Modules {
    pub mutation: Option<Mutation>,
    pub query: Option<Query>,
}

impl Default for Modules {
    fn default() -> Modules {
        Modules {
            mutation: None,
            query: None,
        }
    }
}

#[derive(Clone, Debug)]
pub struct Mutation {
    schema: Schema,
    module: Module,
}

#[derive(Clone, Debug)]
pub struct Query {
    schema: Schema,
    module: Module,
}

#[derive(Clone, Debug)]
pub struct Module {
    language: String,
    file: String,
}

#[derive(Clone, Debug)]
pub struct Schema {
    file: String,
}

#[derive(Clone, Debug)]
pub struct ImportRedirects {
    pub uri: String,
    pub schema: String,
}
