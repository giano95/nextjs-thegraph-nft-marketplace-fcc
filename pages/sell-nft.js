import Head from "next/head"
import { Form, useNotification, Button } from "web3uikit"
import styles from "../styles/Home.module.css"
import { useMoralis } from "react-moralis"
import { ethers } from "ethers"
import { useState, useEffect } from "react"

const contractAbis = require("../constants/abisMapping.json")
const nftMarketplaceAbi = contractAbis["NftMarketplace"]
const nftAbi = contractAbis["FreakyEyes"]

export default function Home() {
    const { chainId, account, isWeb3Enabled, Moralis } = useMoralis()
    const provider = Moralis.web3
    const dispatch = useNotification()
    const [proceeds, setProceeds] = useState("0")

    // Get the Marketplace COntract address using the chainId
    const chainIdString = chainId ? parseInt(chainId).toString() : "31337"
    const contractAddresses = require("../constants/addressesMapping.json")
    const marketplaceAddress = contractAddresses[chainIdString].NftMarketplace

    const runContractFunction = async ({ onError, onSuccess, params }) => {
        let tx
        try {
            const signer = provider.getSigner()
            const contract = new ethers.Contract(params.contractAddress, params.abi, signer)
            const args = Object.values(params.params)
            tx = await contract[params.functionName](...args)
        } catch (error) {
            if (onError) onError(error)
            return
        }
        if (onSuccess) onSuccess(tx)
        return tx
    }

    async function approveAndList(data) {
        console.log("Approving...")
        const nftAddress = data.data[0].inputResult
        const tokenId = data.data[1].inputResult
        const price = ethers.utils.parseUnits(data.data[2].inputResult, "ether").toString()

        const approveOptions = {
            abi: nftAbi,
            contractAddress: nftAddress,
            functionName: "approve",
            params: {
                to: marketplaceAddress,
                tokenId: tokenId,
            },
        }

        await runContractFunction({
            params: approveOptions,
            onSuccess: () => handleApproveSuccess(nftAddress, tokenId, price),
            onError: (error) => console.log(error),
        })
    }

    async function handleApproveSuccess(nftAddress, tokenId, price) {
        console.log("Ok! Now time to list")
        const listOptions = {
            abi: nftMarketplaceAbi,
            contractAddress: marketplaceAddress,
            functionName: "listItem",
            params: {
                nftAddress: nftAddress,
                tokenId: tokenId,
                price: price,
            },
        }

        await runContractFunction({
            params: listOptions,
            onSuccess: handleListSuccess,
            onError: (error) => console.log(error),
        })
    }

    async function handleListSuccess(tx) {
        await tx.wait(1)
        dispatch({
            type: "success",
            message: "NFT listing",
            title: "NFT listed",
            position: "topR",
        })
    }

    async function setupUI() {
        const returnedProceeds = await runContractFunction({
            params: {
                abi: nftMarketplaceAbi,
                contractAddress: marketplaceAddress,
                functionName: "getProceeds",
                params: {
                    seller: account,
                },
            },
            onError: (error) => console.log(error),
        })
        if (returnedProceeds) {
            setProceeds(returnedProceeds.toString())
        }
    }

    useEffect(() => {
        if (isWeb3Enabled) {
            setupUI()
        }
    }, [proceeds, account, isWeb3Enabled, chainId])

    const handleWithdrawSuccess = async (tx) => {
        await tx.wait(1)
        dispatch({
            type: "success",
            message: "Withdrawing proceeds",
            position: "topR",
        })
    }

    return (
        <div className="flex flex-col justify-around min-h-screen items-center">
            <div className="w-96">
                <h1 className="py-4 px-4 font-bold text-2xl">Sell Your NFT</h1>
                <Form
                    data={[
                        {
                            name: "NFT Address",
                            type: "text",
                            value: "",
                            key: "nftAddress",
                            inputWidth: "100%",
                        },
                        {
                            name: "Token ID",
                            type: "number",
                            value: "",
                            key: "tokenId",
                            inputWidth: "100%",
                        },
                        {
                            name: "Price (in ETH)",
                            type: "number",
                            value: "",
                            key: "price",
                            inputWidth: "100%",
                        },
                    ]}
                    onSubmit={approveAndList}
                ></Form>
            </div>
            <div className="pb-[100px]">
                {proceeds != "0" ? (
                    <Button
                        onClick={() => {
                            runContractFunction({
                                params: {
                                    abi: nftMarketplaceAbi,
                                    contractAddress: marketplaceAddress,
                                    functionName: "withdrawProceeds",
                                    params: {},
                                },
                                onError: (error) => console.log(error),
                                onSuccess: handleWithdrawSuccess,
                            })
                        }}
                        text={"Withdraw " + ethers.utils.formatUnits(proceeds, "ether") + " ETH"}
                        type="button"
                    />
                ) : (
                    <div>No proceeds detected</div>
                )}
            </div>
        </div>
    )
}
