import axios from "axios"
import { deleteDoc, deleteField, doc, onSnapshot, updateDoc } from "firebase/firestore"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import {
	Button, Center, ListItem, OrderedList, Skeleton, Text, Tooltip, useToast, VStack
} from "@chakra-ui/react"

import { roomsColl } from "../firebase"
import { iRoom } from "../models/Room"

const Lobby = () => {
	const location = useLocation()
	const navigate = useNavigate()
	const toast = useToast()

	const [username, setUsername] = useState<string | null>(null)
	const [room, setRoom] = useState<iRoom | null>(null)
	const roomRef = doc(roomsColl, room?.id ?? "-")

	useEffect(() => {
		if (room === null) {
			const state = location.state as {
				room: iRoom
				username: string
			}

			if (state) {
				setRoom(state.room)
				setUsername(state.username)
			} else {
				navigate("/")
				toast({
					title: "No lobby found",
					description: "Could not re-enter the lobby page",
					status: "error",
					duration: 2500
				})
			}
		}
	}, [room, location])

	useEffect(() => {
		if (room === null || username === null) return

		return onSnapshot(roomRef, doc => {
			if (doc.exists()) {
				const room = doc.data()

				if (username in room.game) {
					if (Object.keys(room.game[username]!).length === 1) {
						navigate("/game", {
							state: {
								username,
								roomId: room.id,
								word: room.words.at(-1)
							}
						})
						toast({
							title: "Game started",
							description: `${room.owner} started the game`,
							status: "success",
							duration: 2500
						})
					} else {
						setRoom(doc.data())
					}
				} else {
					navigate("/")
					toast({
						title: "Kicked from room",
						description: "Someone removed you from the game room",
						status: "error",
						duration: 2500
					})
				}
			} else {
				navigate("/")
				if (room.owner === username) {
					toast({
						title: "Room Closed",
						description: "You closed the game room",
						status: "success",
						duration: 2500
					})
				} else {
					toast({
						title: "Room Closed",
						description: "The game room has been closed",
						status: "error",
						duration: 2500
					})
				}
			}
		})
	}, [room, username])

	const startGame = async () => {
		try {
			await axios.post("http://alprom.zectan.com/api/next-round", {
				code: room!.code,
				username: username!
			})
		} catch (e) {
			console.error(e)
		}
	}

	const leaveRoom = async () => {
		try {
			await updateDoc(roomRef, `game.${username}`, deleteField())
			navigate("/")
		} catch (e) {
			console.error(e)
		}
	}

	const closeRoom = async () => {
		try {
			await deleteDoc(roomRef)
		} catch (e) {
			console.error(e)
		}
	}

	return (
		<Center flexDir="column">
			<VStack
				mb="2em"
				spacing={0}>
				<Text
					fontSize="4xl"
					fontWeight="semibold">
					Room Id
				</Text>
				<Skeleton isLoaded={!!room?.code}>
					<Text
						fontSize="3xl"
						fontWeight="semibold">
						{room ? room.code : "000000"}
					</Text>
				</Skeleton>
			</VStack>
			<VStack mb="5em">
				<Text
					textDecoration="underline"
					fontSize="2xl"
					fontWeight="semibold">
					People in this lobby
				</Text>
				<OrderedList>
					{Object.keys(room?.game || {})
						.sort()
						.map((name, index) => (
							<ListItem
								key={index}
								fontSize="xl"
								_hover={{
									textDecoration: "line-through",
									textDecorationThickness: "3px",
									cursor: "pointer"
								}}>
								{name}
							</ListItem>
						))}
				</OrderedList>
			</VStack>
			<Tooltip
				label="Only the room owner can start the game"
				shouldWrapChildren
				mb={2}
				placement="top"
				isDisabled={room?.owner === username}>
				<Button
					size="lg"
					w="lg"
					mb={5}
					isDisabled={room?.owner !== username}
					bgColor="correct"
					_hover={{ bgColor: "hsl(115, 29%, 35%)" }}
					_active={{ bgColor: "hsl(115, 29%, 30%)" }}
					onClick={startGame}>
					Start Game
				</Button>
			</Tooltip>
			<Button
				size="md"
				w="xs"
				bgColor="hsl(0, 70%, 53%)"
				_hover={{ bgColor: "hsl(0, 70%, 45%)" }}
				_active={{ bgColor: "hsl(0, 70%, 40%)" }}
				onClick={room?.owner === username ? closeRoom : leaveRoom}>
				{room?.owner === username ? "Close room" : "Leave room"}
			</Button>
		</Center>
	)
}

export default Lobby
