{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE TypeApplications #-}

module Types where
import Universum
import Language.Javascript.JSaddle (FromJSVal(fromJSVal), (!), ToJSVal, create, (<#), JSString)
import Monadic (doFromJSVal)
import Data.Time.Calendar (Day)
import Language.Javascript.JSaddle.Classes (ToJSVal(toJSVal))
import Yleiset ()
import Data.Aeson (FromJSON)

newtype OID = OID {
    oid :: Text
} deriving (Show, Generic)

data FintrafficSystem = Infra | Jeti | Ruma
  deriving (Show, Enum, Bounded, Eq, Read)

instance ToJSVal FintrafficSystem where
    toJSVal = toJSVal . show @Text

instance FromJSVal FintrafficSystem where
    fromJSVal = doFromJSVal "FintrafficSystem" $ \x -> do
        txt <- MaybeT $ fromJSVal x
        hoistMaybe $ find ((== txt) . show @Text) [minBound ..]

data VaylaSystem = Trex
  deriving (Show, Enum, Bounded, Eq)

mkFintrafficSystem :: Natural -> Maybe FintrafficSystem
mkFintrafficSystem 1 = Just Infra
mkFintrafficSystem 2 = Just Jeti
mkFintrafficSystem 7 = Just Ruma
mkFintrafficSystem _ = Nothing

mkVaylaSystem :: Natural -> Maybe VaylaSystem
mkVaylaSystem 1 = Just Trex
mkVaylaSystem _ = Nothing




instance FromJSVal OID where
    fromJSVal = doFromJSVal "OID" $ \x -> do
        oid <- MaybeT $ fromJSVal x
        pure $ OID oid

instance ToJSVal OID where
    toJSVal = toJSVal . oid

data SRSName = EPSG3067 | CRS84
    deriving (Show, Generic)

instance FromJSVal SRSName where
    fromJSVal = doFromJSVal "SRSName" $ \x -> do
        srs :: Text <- MaybeT $ fromJSVal x
        case srs of
            "epsg:3067" -> pure EPSG3067
            "crs:84"    -> pure CRS84
            _ -> mzero

data GeometryType = POINT | LINESTRING | POLYGON | MULTIPOINT | MULTILINESTRING | MULTIPOLYGON | GEOMETRYCOLLECTION
  deriving (Show, Read)

instance ToJSVal GeometryType where
    toJSVal = toJSVal . show @Text

data Point = Point {
    longitude :: Int,
    latitude  :: Int
} deriving (Show, Generic)

instance ToJSVal Point where
    toJSVal Point{..} = toJSVal [longitude, latitude]

instance FromJSVal Point where
    fromJSVal = doFromJSVal "Point" $ \x -> do
        xs <- MaybeT $ fromJSVal x
        case xs of
            [lon,lat] -> pure $ Point lon lat
            _ -> mzero

data Direction = Inc | Dec
  deriving (Show, Generic)

instance FromJSVal Direction where
    fromJSVal = doFromJSVal "Direction" $ \x -> do
        y :: Char <- MaybeT $ fromJSVal x
        case y of
            '+' -> pure Inc
            '-' -> pure Dec
            _ -> mzero

instance ToJSVal Direction where
    toJSVal Inc = toJSVal @Text "+"
    toJSVal Dec = toJSVal @Text "-"

-- Distance in meters
newtype Distance = Distance {
    meters :: Natural
} deriving (Show, Generic)

instance FromJSVal Distance where
    fromJSVal = doFromJSVal "Distance" $ \x -> do
        y <- MaybeT $ fromJSVal x
        pure $ Distance y

instance ToJSVal Distance where
    toJSVal = toJSVal . meters

data Kmetaisyys = Kmetaisyys {
    ratakm :: Natural,
    etaisyys :: Distance
}

instance FromJSVal Kmetaisyys where
    fromJSVal = doFromJSVal "Kmetaisyys" $ \x -> do
        r <- MaybeT $ fromJSVal =<< x ! ("ratakm" :: Text)
        k  <- MaybeT $ fromJSVal =<< x ! ("etaisyys" :: Text)
        pure $ Kmetaisyys r k

instance ToJSVal Kmetaisyys where
    toJSVal Kmetaisyys{..} = do
        o <- create
        o <# ("ratakm" :: JSString) $ toJSVal ratakm
        o <# ("etaisyys" :: JSString) $ toJSVal etaisyys
        toJSVal o

data Ratakmetaisyys = Ratakmetaisyys {
    ratanumero :: Text,
    kmetaisyys :: Kmetaisyys
}

instance FromJSVal Ratakmetaisyys where
    fromJSVal = doFromJSVal "Ratakmetaisyys" $ \x -> do
        r <- MaybeT $ fromJSVal =<< x ! ("ratanumero" :: Text)
        k  <- MaybeT $ fromJSVal =<< x ! ("kmetaisyys" :: Text)
        pure $ Ratakmetaisyys r k

instance ToJSVal Ratakmetaisyys where
    toJSVal Ratakmetaisyys{..} = do
        o <- create
        o <# ("ratanumero" :: JSString) $ toJSVal ratanumero
        o <# ("kmetaisyys" :: JSString) $ toJSVal kmetaisyys
        toJSVal o

data Ratakmvali = Ratakmvali {
    ratanumero :: Text,
    alku :: Kmetaisyys,
    loppu :: Kmetaisyys
}

instance FromJSVal Ratakmvali where
    fromJSVal = doFromJSVal "Ratakmvali" $ \x -> do
        r <- MaybeT $ fromJSVal =<< x ! ("ratanumero" :: Text)
        a <- MaybeT $ fromJSVal =<< x ! ("alku" :: Text)
        l <- MaybeT $ fromJSVal =<< x ! ("loppu" :: Text)
        pure $ Ratakmvali r a l

instance ToJSVal Ratakmvali where
    toJSVal Ratakmvali{..} = do
        o <- create
        o <# ("ratanumero" :: JSString) $ toJSVal ratanumero
        o <# ("alku" :: JSString) $ toJSVal alku
        o <# ("loppu" :: JSString) $ toJSVal loppu
        toJSVal o

data Pmsijainti = Pmsijainti {
    numero :: Natural,
    suunta :: Direction,
    etaisyys :: Distance
}

instance FromJSVal Pmsijainti where
    fromJSVal = doFromJSVal "Pmsijainti" $ \x -> do
        n <- MaybeT $ fromJSVal =<< x ! ("numero" :: Text)
        s  <- MaybeT $ fromJSVal =<< x ! ("suunta" :: Text)
        e  <- MaybeT $ fromJSVal =<< x ! ("etaisyys" :: Text)
        pure $ Pmsijainti n s e

instance ToJSVal Pmsijainti where
    toJSVal Pmsijainti{..} = do
        o <- create
        o <# ("numero" :: JSString) $ toJSVal numero
        o <# ("suunta" :: JSString) $ toJSVal suunta
        o <# ("etaisyys" :: JSString) $ toJSVal etaisyys
        toJSVal o

newtype Revision = Revision {
    revisio :: Natural
} deriving (Show, Generic)

instance FromJSON Revision

data Revisions = Revisions {
    infra :: Text,
    etj2 :: Text
} deriving Show

instance FromJSVal Revisions where
    fromJSVal = doFromJSVal "Revisions" $ \x -> do
        i <- MaybeT $ fromJSVal =<< x ! ("infra" :: Text)
        e  <- MaybeT $ fromJSVal =<< x ! ("etj2" :: Text)
        pure $ Revisions i e

data Train = Train {
    departureDate :: Day,
    trainNumber :: Natural
} deriving Show

instance ToJSVal Train where
    toJSVal Train{..} = do
        o <- create
        o <# ("departureDate" :: JSString) $ toJSVal departureDate
        o <# ("trainNumber" :: JSString) $ toJSVal trainNumber
        toJSVal o

instance FromJSVal Train where
    fromJSVal = doFromJSVal "Train" $ \x ->
        Train <$> MaybeT (fromJSVal =<< x ! ("departureDate" :: JSString))
              <*> MaybeT (fromJSVal =<< x ! ("trainNumber" :: JSString))

data Route = Route {
    start :: Text
  , legs :: [Text]
  , end :: Text
}

instance ToJSVal Route where
    toJSVal Route{..} = do
        o <- create
        o <# ("start" :: JSString) $ toJSVal start
        o <# ("legs" :: JSString) $ toJSVal legs
        o <# ("end" :: JSString) $ toJSVal end
        toJSVal o

instance FromJSVal Route where
    fromJSVal = doFromJSVal "Route" $ \x ->
        Route <$> MaybeT (fromJSVal =<< x ! ("start" :: JSString))
              <*> MaybeT (fromJSVal =<< x ! ("legs" :: JSString))
              <*> MaybeT (fromJSVal =<< x ! ("end" :: JSString))