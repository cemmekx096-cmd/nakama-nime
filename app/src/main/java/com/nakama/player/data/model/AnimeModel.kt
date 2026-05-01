package com.nakama.player.data.model

import androidx.room.Entity
import androidx.room.Index

/**
 * Model anime yang disimpan ke pustaka / history.
 * Primary key: kombinasi animeId + pkg
 * (anime yang sama bisa ada dari extension berbeda)
 */
@Entity(
    tableName = "anime",
    primaryKeys = ["animeId", "pkg"],
    indices = [
        Index(value = ["pkg"]),
        Index(value = ["addedAt"]),
        Index(value = ["lastWatchedAt"])
    ]
)
data class AnimeModel(
    val animeId:       String,  // ID dari source (contoh: "one-piece")
    val pkg:           String,  // extension package (contoh: "id.oploverz")
    val title:         String,
    val thumbnailUrl:  String,
    val coverUrl:      String  = "",
    val synopsis:      String  = "",
    val genres:        String  = "", // JSON array string: ["Action","Comedy"]
    val status:        String  = "", // "Ongoing" | "Completed"
    val year:          String  = "",
    val rating:        String  = "",
    val sourceUrl:     String  = "", // URL halaman anime di source
    val inLibrary:     Boolean = false,
    val addedAt:       Long    = System.currentTimeMillis(),
    val lastWatchedAt: Long    = 0L
)
