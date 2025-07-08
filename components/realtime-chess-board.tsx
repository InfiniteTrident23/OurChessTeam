"use client"

import { useState, useEffect } from "react"

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
        // Empty squares
        const emptyCount = Number.parseInt(char)
        for (let j = 0; j < emptyCount; j++) {
          row.push(null)
        }
      } else {
        // Piece
        const color: PieceColor = char === char.toUpperCase() ? "white" : "black"
        const pieceChar = char.toLowerCase()
        let type: PieceType

        switch (pieceChar) {
          case "k":
            type = "king"
            break
          case "q":
            type = "queen"
            break
          case "r":
            type = "rook"
            break
          case "b":
            type = "bishop"
            break
          case "n":
            type = "knight"
            break
          case "p":
            type = "pawn"
            break
          default:
            continue
        }

        row.push({ type, color })
      }
    }
    return row
  })
}

// Convert board array to FEN
function boardToFen(board: (Piece | null)[][], currentTurn: "white" | "black"): string {
  const ranks = board.map((rank) => {
    let rankStr = ""
    let emptyCount = 0

    for (const piece of rank) {
      if (piece === null) {
        emptyCount++
      } else {
        if (emptyCount > 0) {
          rankStr += emptyCount.toString()
          emptyCount = 0
        }

        let pieceChar = piece.type === "knight" ? "n" : piece.type[0]
        if (piece.color === "white") {
          pieceChar = pieceChar.toUpperCase()
        }
        rankStr += pieceChar
      }
    }

    if (emptyCount > 0) {
      rankStr += emptyCount.toString()
    }

    return rankStr
  })

  const turn = currentTurn === "white" ? "w" : "b"
  return `${ranks.join("/")} ${turn} KQkq - 0 1`
}

// Convert position to algebraic notation
function positionToAlgebraic(row: number, col: number): string {
  const files = "abcdefgh"
  const ranks = "87654321"
  return files[col] + ranks[row]
}

export default function RealtimeChessBoard({
  boardState,
  currentTurn,
  userColor,
  isUserTurn,
  disabled = false,
  onMove,
}: RealtimeChessBoardProps) {
  const [board, setBoard] = useState<(Piece | null)[][]>([])
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null)

  // Update board when boardState changes
  useEffect(() => {
    setBoard(fenToBoard(boardState))
  }, [boardState])

  const handleSquareClick = async (row: number, col: number) => {
    if (disabled || !isUserTurn) return

    if (selectedSquare) {
      const [selectedRow, selectedCol] = selectedSquare
      const selectedPiece = board[selectedRow][selectedCol]

      // If clicking on the same square, deselect
      if (selectedRow === row && selectedCol === col) {
        setSelectedSquare(null)
        return
      }

      // If there's a selected piece and it belongs to current player
      if (selectedPiece && selectedPiece.color === userColor) {
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

        const from = positionToAlgebraic(selectedRow, selectedCol)
        const to = positionToAlgebraic(row, col)
        const newBoardState = boardToFen(newBoard, currentTurn === "white" ? "black" : "white")

        const moveData = {
          from,
          to,
          piece: selectedPiece.type,
          captured: targetPiece?.type || null,
          timestamp: new Date().toISOString(),
        }

        const success = await onMove(from, to, newBoardState, moveData)

        if (success) {
          setSelectedSquare(null)
        }
      }
    } else {
      // Select a piece if it belongs to current player
      const piece = board[row][col]
      if (piece && piece.color === userColor) {
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

  const getStatusMessage = () => {
    if (disabled) return "Waiting for opponent to join..."
    if (!userColor) return "Spectating game"
    if (isUserTurn) return "Your turn"
    return `${currentTurn === "white" ? "White" : "Black"} to move`
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-white text-lg font-semibold">{getStatusMessage()}</div>

      <div className="grid grid-cols-8 gap-0 border-2 border-amber-600 bg-amber-600 p-2 rounded-lg">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`
                w-12 h-12 flex items-center justify-center text-2xl cursor-pointer transition-colors
                ${isSquareLight(rowIndex, colIndex) ? "bg-amber-100" : "bg-amber-800"}
                ${isSquareSelected(rowIndex, colIndex) ? "ring-4 ring-blue-400" : ""}
                ${disabled || !isUserTurn ? "cursor-not-allowed opacity-50" : "hover:bg-opacity-80"}
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
          : userColor
            ? "Click on your pieces to select them, then click on a destination square to move."
            : "You are spectating this game."}
      </div>
    </div>
  )
}
