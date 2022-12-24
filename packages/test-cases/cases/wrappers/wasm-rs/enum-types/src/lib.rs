pub mod wrap;
pub use wrap::*;
use wrap::module::{IModule, Module};

impl IModule for Module {
    fn method1(&self, args: ArgsMethod1) -> Result<SanityEnum, String> {
        Ok(args.en)
    }
    
    fn method2(&self, args: ArgsMethod2) -> Result<Vec<SanityEnum>, String> {
        Ok(args.enum_array)
    }
}
