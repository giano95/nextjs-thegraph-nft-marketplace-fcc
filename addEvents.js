const Moralis = require("moralis/node")
require("dotenv").config()

const contractAddresses = require("./constants/addressesMapping.json")
const contractAbis = require("./constants/abisMapping.json")
let chainId = process.env.chainId || 31337

// Moralis understands a local chain is 1337
let moralisChainId = chainId == "31337" ? "1337" : chainId
const contractAddress = contractAddresses[chainId]["NftMarketplace"]

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL
const appId = process.env.NEXT_PUBLIC_APP_ID
const masterKey = process.env.moralisMasterKey

async function main() {
    await Moralis.start({ serverUrl, appId, masterKey })
    console.log(`Working with contrat address ${contractAddress}`)

    let itemListedOptions = {
        chainId: moralisChainId,
        sync_historical: true, // Grub also old events
        address: contractAddress, // Address of the contract emitting the event
        topic: "ItemListed(address, address, uint256, uint256)", // Structure of the event
        abi: contractAbis["NftMarketplace"].events["ItemListed(address,address,uint256,uint256)"], // The ABI only of the event
        tableName: "ItemListed", // The name of the table created in the moralis database
    }

    let itemBoughtOptions = {
        chainId: moralisChainId,
        sync_historical: true, // Grub also old events
        address: contractAddress, // Address of the contract emitting the event
        topic: "ItemBought(address, address, uint256, uint256)", // Structure of the event
        abi: contractAbis["NftMarketplace"].events["ItemBought(address,address,uint256,uint256)"], // The ABI only of the event
        tableName: "ItemBought", // The name of the table created in the moralis database
    }

    let itemCanceledOptions = {
        chainId: moralisChainId,
        sync_historical: true, // Grub also old events
        address: contractAddress, // Address of the contract emitting the event
        topic: "ItemCanceled(address,address,uint256)", // Structure of the event
        abi: contractAbis["NftMarketplace"].events["ItemCanceled(address,address,uint256)"], // The ABI only of the event
        tableName: "ItemCanceled", // The name of the table created in the moralis database
    }

    const listedResponse = await Moralis.Cloud.run("watchContractEvent", itemListedOptions, {
        useMasterKey: true,
    })
    const boughtResponse = await Moralis.Cloud.run("watchContractEvent", itemBoughtOptions, {
        useMasterKey: true,
    })
    const canceledResponse = await Moralis.Cloud.run("watchContractEvent", itemCanceledOptions, {
        useMasterKey: true,
    })
    if (listedResponse.success && canceledResponse.success && boughtResponse.success) {
        console.log("Success! Database Updated with watching events")
    } else {
        console.log("Something went wrong...")
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
