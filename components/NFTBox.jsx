import Image from "next/image"
import { useState, useEffect } from "react"
import { useWeb3Contract, useMoralis } from "react-moralis"
import { ethers } from "ethers"
import { Card, useNotification } from "web3uikit"
import UpdateListingModal from "./UpdateListingModal"

const contractAbis = require("../constants/abisMapping.json")
const nftMarketplaceAbi = contractAbis["NftMarketplace"]
const nftAbi = contractAbis["FreakyEyes"]

export default function NFTBox({ price, nftAddress, tokenId, marketplaceAddress, seller }) {
    const { isWeb3Enabled, account, Moralis } = useMoralis()
    const [imageURL, setImageURL] = useState("")
    const [tokenName, setTokenName] = useState("")
    const [tokenDescription, setTokenDescription] = useState("")
    const [showModal, setShowModal] = useState(false)
    const provider = Moralis.web3
    const dispatch = useNotification()

    const getTokenURI = async ({ onError, onSuccess }) => {
        let tokenURI
        try {
            const nftContract = new ethers.Contract(nftAddress, nftAbi, provider)
            tokenURI = await nftContract.tokenURI(tokenId)
        } catch (error) {
            if (onError) onError(error)
            return null
        }
        if (onSuccess) onSuccess(tokenURI)
        return tokenURI
    }

    const buyItem = async ({ onError, onSuccess }) => {
        let tx
        try {
            const signer = provider.getSigner()
            const marketplaceContract = new ethers.Contract(
                marketplaceAddress,
                nftMarketplaceAbi,
                signer
            )
            tx = await marketplaceContract.buyItem(nftAddress, tokenId, { value: price })
        } catch (error) {
            if (onError) onError(error)
            return null
        }
        if (onSuccess) onSuccess(tx)
        return tx
    }

    async function updateUI() {
        const tokenURI = await getTokenURI({
            onError: (error) => console.log(error),
        })

        if (tokenURI) {
            // IPFS Gateway: A server that will return IPFS files from a "normal" URL.
            // We change the first part of our URI and transform it in a URL
            const tokenURL = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/")

            // Then we fetch the data fromt it into json obj
            const tokenURLResponse = await (await fetch(tokenURL)).json()

            // Then we get the imageURI, transofrm it in a URL and save it
            const imageURI = tokenURLResponse.image
            const imageURL = imageURI.replace("ipfs://", "https://ipfs.io/ipfs/")
            setImageURL(imageURL)
            setTokenName(tokenURLResponse.name)
            setTokenDescription(tokenURLResponse.description)
            console.log(nftAddress)
        }
    }

    useEffect(() => {
        if (isWeb3Enabled) {
            updateUI()
        }
    }, [isWeb3Enabled])

    // if seller is = current account or there is no seller then
    // we assume that the user is the owner
    const isOwnedByUser = seller === account || seller === undefined

    const handleCardClick = async () => {
        isOwnedByUser
            ? setShowModal(true)
            : await buyItem({
                  onSuccess: handleBuyItemSuccess,
                  onError: (error) => console.log(error),
              })
    }

    const handleBuyItemSuccess = async (tx) => {
        await tx.wait(1)
        dispatch({
            type: "success",
            message: "Item bought!",
            title: "Item bought - please refresh (and move blocks)",
            position: "topR",
        })
    }

    return (
        <div>
            <div>
                {imageURL ? (
                    <div>
                        {
                            <UpdateListingModal
                                nftAddress={nftAddress}
                                tokenId={tokenId}
                                marketplaceAddress={marketplaceAddress}
                                isVisible={showModal}
                                onClose={() => {
                                    setShowModal(false)
                                }}
                            ></UpdateListingModal>
                        }
                        <Card
                            title={tokenName}
                            description={tokenDescription}
                            onClick={handleCardClick}
                        >
                            <div className="p-2">
                                <div className="flex flex-col items-end gap-2">
                                    <div>#{tokenId}</div>
                                    <div className="italic text-sm">
                                        Owned by{" "}
                                        {isOwnedByUser
                                            ? "you"
                                            : seller.slice(0, 4) + "..." + seller.slice(-4)}
                                    </div>
                                    <Image
                                        loader={() => imageURL}
                                        src={imageURL}
                                        width="250"
                                        height="250"
                                    ></Image>
                                    <div className="font-bold">
                                        {ethers.utils.formatUnits(price, "ether")} ETH
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div>loading...</div>
                )}
            </div>
        </div>
    )
}
