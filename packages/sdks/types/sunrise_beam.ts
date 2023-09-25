export type SunriseBeam = {
  "version": "0.1.0",
  "name": "sunrise_core",
  "instructions": [
    {
      "name": "registerState",
      "docs": [
        "Initializes a [State], setting its initial parameters."
      ],
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gsolMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "input",
          "type": {
            "defined": "RegisterStateInput"
          }
        }
      ]
    },
    {
      "name": "updateState",
      "docs": [
        "Updates a [State] without modifying its [BeamDetails] list."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "input",
          "type": {
            "defined": "UpdateStateInput"
          }
        }
      ]
    },
    {
      "name": "registerBeam",
      "docs": [
        "Registers a beam by appending a newly-created [BeamDetails] with an",
        "allocation of 0 to the [State]. Currently, this triggers a resize if needed.",
        "",
        "The `beam` is an account that will be expected to sign CPI requests to this program.",
        "",
        "Errors if a resize is needed but the `alloc_window` is zero."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamAccount",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "resizeAllocations",
      "docs": [
        "Resize the state so it can append `additional` more allocations."
      ],
      "accounts": [
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "additionalBeams",
          "type": "u8"
        }
      ]
    },
    {
      "name": "updateAllocations",
      "docs": [
        "Updates allocations for beams.",
        "",
        "Errors if the sum of allocations after the update doesn't equal 100, or if",
        "one of the keys in `new_allocations` refers to an unrecognized beam."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "newAllocations",
          "type": {
            "vec": {
              "defined": "AllocationUpdate"
            }
          }
        }
      ]
    },
    {
      "name": "mintGsol",
      "docs": [
        "CPI request from a beam program to mint gSol.",
        "",
        "This checks for the signature of the account with the registered key, and",
        "verifies that the immediate calling program owns that account."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beam",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gsolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintGsolTo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "instructionsSysvar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "burnGsol",
      "docs": [
        "CPI request from a beam program to burn gSol.",
        "",
        "Same invariants as for [minting][sunrise_core::mint_gsol()]."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beam",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "burnGsolFromOwner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "burnGsolFrom",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "instructionsSysvar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "removeBeam",
      "docs": [
        "Removes a beam from the state.",
        "",
        "Errors if the beam's allocation is not set to zero."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "beam",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "exportMintAuthority",
      "docs": [
        "Exports the gsol mint authority to a new account."
      ],
      "accounts": [
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gsolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "state",
      "docs": [
        "The state for the Sunrise beam controller program."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateAuthority",
            "docs": [
              "Update authority for this state."
            ],
            "type": "publicKey"
          },
          {
            "name": "gsolMint",
            "docs": [
              "The Sunrise gSol mint."
            ],
            "type": "publicKey"
          },
          {
            "name": "preSupply",
            "docs": [
              "The gSol mint supply when this program started",
              "monitoring it."
            ],
            "type": "u64"
          },
          {
            "name": "gsolMintAuthorityBump",
            "docs": [
              "Bump of the gSol mint authority PDA."
            ],
            "type": "u8"
          },
          {
            "name": "yieldAccount",
            "docs": [
              "The Sunrise yield account."
            ],
            "type": "publicKey"
          },
          {
            "name": "allocations",
            "docs": [
              "Holds [BeamDetails] for all supported beams."
            ],
            "type": {
              "vec": {
                "defined": "BeamDetails"
              }
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "BeamDetails",
      "docs": [
        "Holds information about a registed beam."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "docs": [
              "Expected signer for mint and burn requests."
            ],
            "type": "publicKey"
          },
          {
            "name": "allocation",
            "docs": [
              "This beam's allocation expressed as a percentage."
            ],
            "type": "u8"
          },
          {
            "name": "partialGsolSupply",
            "docs": [
              "The total amount of circulating gsol this beam is responsible for."
            ],
            "type": "u64"
          },
          {
            "name": "drainingMode",
            "docs": [
              "A beam in drain accepts withdrawals but not deposits."
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "RegisterStateInput",
      "docs": [
        "Arguments for registering a new [State]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateAuthority",
            "type": "publicKey"
          },
          {
            "name": "yieldAccount",
            "type": "publicKey"
          },
          {
            "name": "initialCapacity",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "UpdateStateInput",
      "docs": [
        "Arguments for updating [State] parameters."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newUpdateAuthority",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "newYieldAccount",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "newGsolMint",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "newGsolMintAuthorityBump",
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "AllocationUpdate",
      "docs": [
        "Arguments for updating a beam's allocation."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "beam",
            "type": "publicKey"
          },
          {
            "name": "newAllocation",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidParameter",
      "msg": "Invariant violated by parameter input"
    },
    {
      "code": 6001,
      "name": "MintWindowExceeded",
      "msg": "This beam does not support minting this amount"
    },
    {
      "code": 6002,
      "name": "BurnWindowExceeded",
      "msg": "This beam does not support burning this amount"
    },
    {
      "code": 6003,
      "name": "WouldExceedBeamCapacity",
      "msg": "Can't exceed the beam capacity of this state"
    },
    {
      "code": 6004,
      "name": "DuplicateBeamEntry",
      "msg": "Tried to register an already-registered beam"
    },
    {
      "code": 6005,
      "name": "NoSpaceInAllocations",
      "msg": "No space in allocations for new entry"
    },
    {
      "code": 6006,
      "name": "UnidentifiedBeam",
      "msg": "Not a valid beam that this program recognizes"
    },
    {
      "code": 6007,
      "name": "UnidentifiedCallingProgram",
      "msg": "Cpi isn't directly being made by beam program"
    },
    {
      "code": 6008,
      "name": "NonZeroAllocation",
      "msg": "Can't remove a beam with a non-zero allocation"
    }
  ]
};

export const IDL: SunriseBeam = {
  "version": "0.1.0",
  "name": "sunrise_core",
  "instructions": [
    {
      "name": "registerState",
      "docs": [
        "Initializes a [State], setting its initial parameters."
      ],
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "gsolMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "input",
          "type": {
            "defined": "RegisterStateInput"
          }
        }
      ]
    },
    {
      "name": "updateState",
      "docs": [
        "Updates a [State] without modifying its [BeamDetails] list."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "input",
          "type": {
            "defined": "UpdateStateInput"
          }
        }
      ]
    },
    {
      "name": "registerBeam",
      "docs": [
        "Registers a beam by appending a newly-created [BeamDetails] with an",
        "allocation of 0 to the [State]. Currently, this triggers a resize if needed.",
        "",
        "The `beam` is an account that will be expected to sign CPI requests to this program.",
        "",
        "Errors if a resize is needed but the `alloc_window` is zero."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "beamAccount",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "resizeAllocations",
      "docs": [
        "Resize the state so it can append `additional` more allocations."
      ],
      "accounts": [
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "additionalBeams",
          "type": "u8"
        }
      ]
    },
    {
      "name": "updateAllocations",
      "docs": [
        "Updates allocations for beams.",
        "",
        "Errors if the sum of allocations after the update doesn't equal 100, or if",
        "one of the keys in `new_allocations` refers to an unrecognized beam."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "newAllocations",
          "type": {
            "vec": {
              "defined": "AllocationUpdate"
            }
          }
        }
      ]
    },
    {
      "name": "mintGsol",
      "docs": [
        "CPI request from a beam program to mint gSol.",
        "",
        "This checks for the signature of the account with the registered key, and",
        "verifies that the immediate calling program owns that account."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beam",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gsolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintGsolTo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "instructionsSysvar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "burnGsol",
      "docs": [
        "CPI request from a beam program to burn gSol.",
        "",
        "Same invariants as for [minting][sunrise_core::mint_gsol()]."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "beam",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "burnGsolFromOwner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "burnGsolFrom",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "instructionsSysvar",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "removeBeam",
      "docs": [
        "Removes a beam from the state.",
        "",
        "Errors if the beam's allocation is not set to zero."
      ],
      "accounts": [
        {
          "name": "state",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "beam",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "exportMintAuthority",
      "docs": [
        "Exports the gsol mint authority to a new account."
      ],
      "accounts": [
        {
          "name": "updateAuthority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "state",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gsolMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gsolMintAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "newAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "state",
      "docs": [
        "The state for the Sunrise beam controller program."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateAuthority",
            "docs": [
              "Update authority for this state."
            ],
            "type": "publicKey"
          },
          {
            "name": "gsolMint",
            "docs": [
              "The Sunrise gSol mint."
            ],
            "type": "publicKey"
          },
          {
            "name": "preSupply",
            "docs": [
              "The gSol mint supply when this program started",
              "monitoring it."
            ],
            "type": "u64"
          },
          {
            "name": "gsolMintAuthorityBump",
            "docs": [
              "Bump of the gSol mint authority PDA."
            ],
            "type": "u8"
          },
          {
            "name": "yieldAccount",
            "docs": [
              "The Sunrise yield account."
            ],
            "type": "publicKey"
          },
          {
            "name": "allocations",
            "docs": [
              "Holds [BeamDetails] for all supported beams."
            ],
            "type": {
              "vec": {
                "defined": "BeamDetails"
              }
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "BeamDetails",
      "docs": [
        "Holds information about a registed beam."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "docs": [
              "Expected signer for mint and burn requests."
            ],
            "type": "publicKey"
          },
          {
            "name": "allocation",
            "docs": [
              "This beam's allocation expressed as a percentage."
            ],
            "type": "u8"
          },
          {
            "name": "partialGsolSupply",
            "docs": [
              "The total amount of circulating gsol this beam is responsible for."
            ],
            "type": "u64"
          },
          {
            "name": "drainingMode",
            "docs": [
              "A beam in drain accepts withdrawals but not deposits."
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "RegisterStateInput",
      "docs": [
        "Arguments for registering a new [State]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "updateAuthority",
            "type": "publicKey"
          },
          {
            "name": "yieldAccount",
            "type": "publicKey"
          },
          {
            "name": "initialCapacity",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "UpdateStateInput",
      "docs": [
        "Arguments for updating [State] parameters."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newUpdateAuthority",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "newYieldAccount",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "newGsolMint",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "newGsolMintAuthorityBump",
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "AllocationUpdate",
      "docs": [
        "Arguments for updating a beam's allocation."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "beam",
            "type": "publicKey"
          },
          {
            "name": "newAllocation",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidParameter",
      "msg": "Invariant violated by parameter input"
    },
    {
      "code": 6001,
      "name": "MintWindowExceeded",
      "msg": "This beam does not support minting this amount"
    },
    {
      "code": 6002,
      "name": "BurnWindowExceeded",
      "msg": "This beam does not support burning this amount"
    },
    {
      "code": 6003,
      "name": "WouldExceedBeamCapacity",
      "msg": "Can't exceed the beam capacity of this state"
    },
    {
      "code": 6004,
      "name": "DuplicateBeamEntry",
      "msg": "Tried to register an already-registered beam"
    },
    {
      "code": 6005,
      "name": "NoSpaceInAllocations",
      "msg": "No space in allocations for new entry"
    },
    {
      "code": 6006,
      "name": "UnidentifiedBeam",
      "msg": "Not a valid beam that this program recognizes"
    },
    {
      "code": 6007,
      "name": "UnidentifiedCallingProgram",
      "msg": "Cpi isn't directly being made by beam program"
    },
    {
      "code": 6008,
      "name": "NonZeroAllocation",
      "msg": "Can't remove a beam with a non-zero allocation"
    }
  ]
};
