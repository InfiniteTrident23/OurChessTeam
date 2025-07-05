"use client"

import { useState } from "react"

type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn"
type PieceColor = "white" | "black"

interface Piece {
  type: PieceType
  color: PieceColor
}

interface ChessBoardProps {
  disabled?: boolean
}

const initialBoard: (Piece | null)[][] = [
  [
    { type: "rook", color: "black" },
    { type: "knight", color: "black" },
    { type: "bishop", color: "black" },
    { type: "queen", color: "black" },
    { type: "king", color: "black" },
    { type: "bishop", color: "black" },
    { type: "knight", color: "black" },
    { type: "rook", color: "black" },
  ],
  Array(8).fill({ type: "pawn", color: "black" }),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill({ type: "pawn", color: "white" }),
  [
    { type: "rook", color: "white" },
    { type: "knight", color: "white" },
    { type: "bishop", color: "white" },
    { type: "queen", color: "white" },
    { type: "king", color: "white" },
    { type: "bishop", color: "white" },
    { type: "knight", color: "white" },
    { type: "rook", color: "white" },
  ],
]

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

export default function ChessBoard({ disabled = false }: ChessBoardProps) {
  const [board, setBoard] = useState<(Piece | null)[][]>(initialBoard)
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>("white")

  const handleSquareClick = (row: number, col: number) => {
    if (disabled) return

    if (selectedSquare) {
      const [selectedRow, selectedCol] = selectedSquare
      const selectedPiece = board[selectedRow][selectedCol]

      // If clicking on the same square, deselect
      if (selectedRow === row && selectedCol === col) {
        setSelectedSquare(null)
        return
      }

      // If there's a selected piece and it belongs to current player
      if (selectedPiece && selectedPiece.color === currentPlayer) {
        // Simple move validation (just check if target square is different)
        const targetPiece = board[row][col]

        // Can't capture own piece
        if (targetPiece && targetPiece.color === selectedPiece.color) {
          setSelectedSquare([row, col])
          return
        }

        // Make the move
        const newBoard = board.map((r) => [...r])
        newBoard[row][col] = selectedPiece
        newBoard[selectedRow][selectedCol] = null

        setBoard(newBoard)
        setSelectedSquare(null)
        setCurrentPlayer(currentPlayer === "white" ? "black" : "white")
      }
    } else {
      // Select a piece if it belongs to current player
      const piece = board[row][col]
      if (piece && piece.color === currentPlayer) {
        setSelectedSquare([row, col])
      }
    }
  }

  const isSquareSelected = (row: number, col: number) => {
    return selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col
  }

  const isSquareLight = (row: number, col: number) => {
    return (row + col) % 2 === 0
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-white text-lg font-semibold">
        {disabled ? "Waiting for game to start..." : `${currentPlayer === "white" ? "White" : "Black"} to move`}
      </div>

      <div className="grid grid-cols-8 gap-0 border-2 border-amber-600 bg-amber-600 p-2 rounded-lg">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`
                w-12 h-12 flex items-center justify-center text-2xl cursor-pointer transition-colors
                ${isSquareLight(rowIndex, colIndex) ? "bg-amber-100" : "bg-amber-800"}
                ${isSquareSelected(rowIndex, colIndex) ? "ring-4 ring-blue-400" : ""}
                ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-opacity-80"}
              `}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
            >
              {piece && (
                <span className={piece.color === "white" ? "text-slate-100" : "text-slate-900"}>
                  {pieceSymbols[piece.color][piece.type]}
                </span>
              )}
            </div>
          )),
        )}
      </div>

      <div className="text-slate-400 text-sm text-center max-w-md">
        {disabled
          ? "The game will start once your opponent joins the room."
          : "Click on a piece to select it, then click on a destination square to move."}
      </div>
    </div>
  )
}
