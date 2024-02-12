use anchor_lang::prelude::Pubkey;
use anchor_lang::Id;

#[derive(Clone)]
pub struct Marinade;

impl Id for Marinade {
    fn id() -> Pubkey {
        marinade_cpi::ID
    }
}
