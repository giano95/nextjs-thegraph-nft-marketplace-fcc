import { Modal, Input, useNotification } from "web3uikit"
import { useState } from "react"
import { useMoralis } from "react-moralis"
import { ethers } from "ethers"

const contractAbis = require("../constants/abisMapping.json")
const nftMarketplaceAbi = contractAbis["NftMarketplace"]
const nftAbi = contractAbis["FreakyEyes"]

export default function UpdateListingModal({
    nftAddress,
    tokenId,
    isVisible,
    marketplaceAddress,
    onClose,
}) {
    const [priceToUpdateListingWith, setPriceToUpdateListingWith] = useState(0)
    const { isWeb3Enabled, account, Moralis } = useMoralis()
    const dispatch = useNotification()
    const provider = Moralis.web3

    const handleUpdateListingSuccess = async (tx) => {
        await tx.wait(1)
        dispatch({
            type: "success",
            message: "listing updated",
            title: "Listing updated - please refresh (and move blocks)",
            position: "topR",
        })
        onClose && onClose()
        setPriceToUpdateListingWith("0")
    }

    const updateListing = async ({ onError, onSuccess }) => {
        let tx
        try {
            const signer = provider.getSigner()
            const marketplaceContract = new ethers.Contract(
                marketplaceAddress,
                nftMarketplaceAbi,
                signer
            )
            tx = await marketplaceContract.updateListing(
                nftAddress,
                tokenId,
                ethers.utils.parseEther(priceToUpdateListingWith || "0")
            )
        } catch (error) {
            if (onError) onError(error)
            return
        }
        if (onSuccess) onSuccess(tx)
        return
    }

    return (
        <Modal
            isVisible={isVisible}
            onCancel={onClose}
            onCloseButtonPressed={onClose}
            onOk={() => {
                updateListing({
                    onError: (error) => {
                        console.log(error)
                    },
                    onSuccess: handleUpdateListingSuccess,
                })
            }}
        >
            <Input
                label="Update listing price in L1 Currency (ETH)"
                name="New listing price"
                type="number"
                onChange={(event) => {
                    setPriceToUpdateListingWith(event.target.value)
                }}
            />
        </Modal>
    )
}
