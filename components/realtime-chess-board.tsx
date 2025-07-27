"use client"

import { useState, useEffect, useRef } from "react"
import { Chess, type Square } from "chess.js"

type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn"
type PieceColor = "white" | "black"

interface Piece {
  type: PieceType
  color: PieceColor
}

interface RealtimeChessBoardProps {
  boardState: string
  currentTurn: "white" | "black"
  userColor: "white" | "black" | null
  isUserTurn: boolean
  disabled?: boolean
  gameState?: any
  onMove: (from: string, to: string, newBoardState: string, moveData: any) => Promise<boolean>
}

const pieceSymbols: Record<PieceColor, Record<PieceType, string>> = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
}

// Convert FEN to board array
function fenToBoard(fen: string): (Piece | null)[][] {
  const [boardPart] = fen.split(" ")
  const ranks = boardPart.split("/")

  return ranks.map((rank) => {
    const row: (Piece | null)[] = []
    for (let i = 0; i < rank.length; i++) {
      const char = rank[i]
      if (char >= "1" && char <= "8") {
        const emptyCount = Number.parseInt(char)
        for (let j = 0; j < emptyCount; j++) row.push(null)
      } else {
        const color: PieceColor = char === char.toUpperCase() ? "white" : "black"
        const pieceChar = char.toLowerCase()
        const typeMap: Record<string, PieceType> = {
          k: "king",
          q: "queen",
          r: "rook",
          b: "bishop",
          n: "knight",
          p: "pawn",
        }
        const type = typeMap[pieceChar]
        if (type) row.push({ type, color })
      }
    }
    return row
  })
}

// Convert position to algebraic notation, accounting for board flip
function positionToAlgebraic(row: number, col: number, isFlipped: boolean): Square {
  const files = "abcdefgh"
  const ranks = "87654321"

  if (isFlipped) {
    // When flipped, we need to reverse both row and column indices
    const flippedRow = 7 - row
    const flippedCol = 7 - col
    return (files[flippedCol] + ranks[flippedRow]) as Square
  }

  return (files[col] + ranks[row]) as Square
}

export default function RealtimeChessBoard({
  boardState,
  currentTurn,
  userColor,
  isUserTurn,
  disabled = false,
  gameState,
  onMove,
}: RealtimeChessBoardProps) {
  const [board, setBoard] = useState<(Piece | null)[][]>([])
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null)
  const [legalMoves, setLegalMoves] = useState<string[]>([])
  const [status, setStatus] = useState<string>("")

  // Track if we've already sent a game-end signal for this board state
  const gameEndSentRef = useRef<string | null>(null)
  const lastBoardStateRef = useRef<string>("")

  // Determine if board should be flipped (black at bottom)
  const isFlipped = userColor === "black"

  // Create internal Chess instance for validation
  useEffect(() => {
    const chess = new Chess()
    chess.load(boardState)

    // Only check for game end if this is a new board state and game isn't already finished
    const isNewBoardState = lastBoardStateRef.current !== boardState
    const gameNotFinished = gameState?.status !== "finished"
    const notAlreadySent = gameEndSentRef.current !== boardState

    if (isNewBoardState && gameNotFinished && notAlreadySent) {
      if (chess.isCheckmate()) {
        setStatus("Checkmate!")
        const winner = currentTurn === "white" ? "black" : "white"
        console.log("Checkmate detected! Winner:", winner, "Board state:", boardState)

        // Mark this board state as having sent the game-end signal
        gameEndSentRef.current = boardState

        if (onMove) {
          onMove("game-end", "checkmate", boardState, {
            type: "game-end",
            reason: "checkmate",
            winner: winner,
            timestamp: new Date().toISOString(),
          })
            .then((success) => {
              console.log("Checkmate game end signal sent, success:", success)
            })
            .catch((error) => {
              console.error("Error sending checkmate game end signal:", error)
              // Reset the flag if there was an error so we can retry
              gameEndSentRef.current = null
            })
        }
      } else if (chess.isStalemate()) {
        setStatus("Stalemate!")
        console.log("Stalemate detected! Board state:", boardState)

        // Mark this board state as having sent the game-end signal
        gameEndSentRef.current = boardState

        if (onMove) {
          onMove("game-end", "stalemate", boardState, {
            type: "game-end",
            reason: "stalemate",
            winner: null, // null means draw
            timestamp: new Date().toISOString(),
          })
            .then((success) => {
              console.log("Stalemate game end signal sent, success:", success)
            })
            .catch((error) => {
              console.error("Error sending stalemate game end signal:", error)
              // Reset the flag if there was an error so we can retry
              gameEndSentRef.current = null
            })
        }
      } else if (chess.isCheck()) {
        setStatus("Check!")
      } else {
        setStatus("")
      }
    } else if (gameState?.status === "finished") {
      // Game is already finished, just update status display
      if (chess.isCheckmate()) {
        setStatus("Checkmate!")
      } else if (chess.isStalemate()) {
        setStatus("Stalemate!")
      }
    }

    // Update the last board state reference
    lastBoardStateRef.current = boardState

    // Set board, flipping if necessary
    let boardArray = fenToBoard(boardState)
    if (isFlipped) {
      // Flip the board: reverse rows and reverse each row
      boardArray = boardArray.reverse().map((row) => row.reverse())
    }
    setBoard(boardArray)
  }, [boardState, currentTurn, onMove, gameState?.status, isFlipped])

  // Reset the game-end flag when game status changes to finished
  useEffect(() => {
    if (gameState?.status === "finished") {
      console.log("Game finished, resetting game-end flag")
      gameEndSentRef.current = null
    }
  }, [gameState?.status])

  const handleSquareClick = async (row: number, col: number) => {
    if (disabled || !isUserTurn || gameState?.status === "finished") return

    const clickedPos = positionToAlgebraic(row, col, isFlipped)
    const chess = new Chess()
    chess.load(boardState)

    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare
      const from = positionToAlgebraic(fromRow, fromCol, isFlipped)

      if (from === clickedPos) {
        setSelectedSquare(null)
        setLegalMoves([])
        return
      }

      const move = chess.move({ from, to: clickedPos, promotion: "q" })

      if (move) {
        const newBoardState = chess.fen()
        const moveData = {
          from,
          to: clickedPos,
          piece: move.piece,
          captured: move.captured || null,
          timestamp: new Date().toISOString(),
        }

        const success = await onMove(from, clickedPos, newBoardState, moveData)
        if (success) {
          setSelectedSquare(null)
          setLegalMoves([])
        }
      } else {
        // Not legal
        const piece = board[row][col]
        if (piece && piece.color === userColor) {
          setSelectedSquare([row, col])
          const newFrom = clickedPos
          const moves = chess.moves({ square: newFrom, verbose: true })
          setLegalMoves(moves.map((m) => m.to))
        } else {
          setSelectedSquare(null)
          setLegalMoves([])
        }
      }
    } else {
      const piece = board[row][col]
      if (piece && piece.color === userColor) {
        setSelectedSquare([row, col])
        const from = clickedPos
        const moves = chess.moves({ square: from, verbose: true })
        setLegalMoves(moves.map((m) => m.to))
      }
    }
  }

  const isSquareSelected = (row: number, col: number) =>
    selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col

  const isLegalMoveSquare = (row: number, col: number) => {
    const algebraicPos = positionToAlgebraic(row, col, isFlipped)
    return legalMoves.includes(algebraicPos)
  }

  const isSquareLight = (row: number, col: number) => {
    // For visual consistency, we want the bottom-right square to always be light
    // regardless of board orientation
    if (isFlipped) {
      return (7 - row + (7 - col)) % 2 === 0
    }
    return (row + col) % 2 === 0
  }

  const getStatusMessage = () => {
    if (disabled) return "Waiting for opponent..."
    if (!userColor) return "Spectating"
    if (status === "Checkmate!") return `Checkmate! ${currentTurn === "white" ? "Black" : "White"} wins!`
    if (status === "Stalemate!") return "Stalemate! Game is a draw!"
    if (status) return status
    if (isUserTurn) return "Your move"
    return `${currentTurn === "white" ? "White" : "Black"} to move`
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-white text-lg font-semibold">{getStatusMessage()}</div>

      {/* Board coordinates - files (a-h) */}
      <div className="flex items-center space-x-2">
        <div className="w-8" /> {/* Spacer for rank labels */}
        <div className="grid grid-cols-8 gap-0">
          {(isFlipped ? ["h", "g", "f", "e", "d", "c", "b", "a"] : ["a", "b", "c", "d", "e", "f", "g", "h"]).map(
            (file) => (
              <div key={file} className="w-12 text-center text-amber-400 text-sm font-semibold">
                {file}
              </div>
            ),
          )}
        </div>
        <div className="w-8" /> {/* Spacer for rank labels */}
      </div>

      <div className="flex items-center space-x-2">
        {/* Rank labels (1-8) - left side */}
        <div className="flex flex-col gap-0">
          {(isFlipped ? ["1", "2", "3", "4", "5", "6", "7", "8"] : ["8", "7", "6", "5", "4", "3", "2", "1"]).map(
            (rank) => (
              <div
                key={rank}
                className="h-12 w-8 flex items-center justify-center text-amber-400 text-sm font-semibold"
              >
                {rank}
              </div>
            ),
          )}
        </div>

        {/* Chess board */}
        <div className="grid grid-cols-8 gap-0 border-2 border-amber-600 bg-amber-600 p-2 rounded-lg">
          {board.map((rowData, row) =>
            rowData.map((piece, col) => {
              const isSelected = isSquareSelected(row, col)
              const isLegal = isLegalMoveSquare(row, col)

              return (
                <div
                  key={`${row}-${col}`}
                  className={`w-12 h-12 flex items-center justify-center text-2xl cursor-pointer relative
                    ${isSquareLight(row, col) ? "bg-amber-200" : "bg-amber-700"}
                    ${isSelected ? "ring-4 ring-blue-400" : ""}
                    ${disabled || !isUserTurn ? "cursor-not-allowed opacity-50" : "hover:bg-opacity-80"}
                  `}
                  onClick={() => handleSquareClick(row, col)}
                >
                  {isLegal && <div className="absolute w-3 h-3 rounded-full bg-blue-500 opacity-60 z-10" />}
                  {piece && (
                    <span className={`z-20 ${piece.color === "white" ? "text-slate-100" : "text-black"}`}>
                      {pieceSymbols[piece.color][piece.type]}
                    </span>
                  )}
                </div>
              )
            }),
          )}
        </div>

        {/* Rank labels (1-8) - right side */}
        <div className="flex flex-col gap-0">
          {(isFlipped ? ["1", "2", "3", "4", "5", "6", "7", "8"] : ["8", "7", "6", "5", "4", "3", "2", "1"]).map(
            (rank) => (
              <div
                key={rank}
                className="h-12 w-8 flex items-center justify-center text-amber-400 text-sm font-semibold"
              >
                {rank}
              </div>
            ),
          )}
        </div>
      </div>

      {/* Board coordinates - files (a-h) bottom */}
      <div className="flex items-center space-x-2">
        <div className="w-8" /> {/* Spacer for rank labels */}
        <div className="grid grid-cols-8 gap-0">
          {(isFlipped ? ["h", "g", "f", "e", "d", "c", "b", "a"] : ["a", "b", "c", "d", "e", "f", "g", "h"]).map(
            (file) => (
              <div key={file} className="w-12 text-center text-amber-400 text-sm font-semibold">
                {file}
              </div>
            ),
          )}
        </div>
        <div className="w-8" /> {/* Spacer for rank labels */}
      </div>

      <div className="text-slate-400 text-sm text-center max-w-md">
        {disabled
          ? "Game will start when opponent joins."
          : userColor
            ? `Playing as ${userColor}. Click a piece to select it, then click a square to move.`
            : "You're spectating this game."}
      </div>
    </div>
  )
}
